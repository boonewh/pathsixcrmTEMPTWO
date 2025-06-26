from quart import Blueprint, request, jsonify
from datetime import datetime
import pandas as pd
import io
from app.models import Lead, User
from app.database import SessionLocal
from app.utils.auth_utils import requires_auth
from app.utils.email_utils import send_assignment_notification
from app.utils.import_utils import map_lead_data

# Change to a separate blueprint to avoid conflicts
imports_bp = Blueprint("imports", __name__, url_prefix="/api/import")


@imports_bp.route("/leads", methods=["POST"])
@requires_auth(roles=["admin"])
async def import_leads():
    """
    Import leads from CSV/Excel file and assign to a specific user.
    Expected CSV columns: OWNER_NAME, PLANT_NAME, ADDRESS, CITY, STATE, PHONE, 
                         SIC_DESC, CONTACT TITLE, CONTACT FIRST NAME, CONTACT LAST NAME, CONTACT EMAIL
    """
    user = request.user
    session = SessionLocal()
    
    try:
        # Get form data
        form = await request.form
        assigned_user_email = form.get('assigned_user_email')
        
        if not assigned_user_email:
            return jsonify({"error": "assigned_user_email is required"}), 400
        
        # Validate that the assigned user exists and is active
        assigned_user = session.query(User).filter(
            User.email == assigned_user_email,
            User.tenant_id == user.tenant_id,
            User.is_active == True
        ).first()
        
        if not assigned_user:
            return jsonify({"error": f"User with email {assigned_user_email} not found or inactive"}), 400
        
        # Get the uploaded file
        files = await request.files
        if 'file' not in files:
            return jsonify({"error": "No file uploaded"}), 400
        
        file = files['file']
        if file.filename == '':
            return jsonify({"error": "No file selected"}), 400
        
        # Read file content
        file_content = file.read()
        
        # Determine file type and parse accordingly
        if file.filename.endswith('.xlsx'):
            # Parse Excel file
            df = pd.read_excel(io.BytesIO(file_content))
        elif file.filename.endswith('.csv'):
            # Parse CSV file
            df = pd.read_csv(io.StringIO(file_content.decode('utf-8')))
        else:
            return jsonify({"error": "Unsupported file format. Please upload CSV or Excel file."}), 400
        
        # Clean column names (remove extra spaces)
        df.columns = df.columns.str.strip()
        
        # Validate required columns
        required_columns = ['PLANT_NAME']
        missing_columns = [col for col in required_columns if col not in df.columns]
        if missing_columns:
            return jsonify({"error": f"Missing required columns: {missing_columns}"}), 400
        
        successful_imports = 0
        failed_imports = []
        
        for index, row in df.iterrows():
            try:
                # Use utility function to map and validate data
                lead_data = map_lead_data(row)
                
                # Create the lead with validated data
                lead = Lead(
                    tenant_id=user.tenant_id,
                    created_by=user.id,  # Admin who imported
                    assigned_to=assigned_user.id,  # User it's assigned to
                    name=lead_data['name'] or f"Plant {index + 1}",
                    contact_person=lead_data['contact_person'],
                    contact_title=lead_data['contact_title'],
                    email=lead_data['email'],
                    phone=lead_data['phone'],
                    phone_label=lead_data['phone_label'],
                    address=lead_data['address'],
                    city=lead_data['city'],
                    state=lead_data['state'],
                    zip=lead_data['zip'],
                    notes=lead_data['notes'],
                    type=lead_data['type'],
                    lead_status=lead_data['lead_status'],
                    created_at=datetime.utcnow()
                )
                
                session.add(lead)
                successful_imports += 1
                
            except Exception as e:
                failed_imports.append({
                    "row": index + 1,
                    "plant_name": str(row.get('PLANT_NAME', 'Unknown')),
                    "error": str(e)
                })
                continue
        
        # Commit all successful imports
        if successful_imports > 0:
            session.commit()
            
            # Send notification email to assigned user
            try:
                await send_assignment_notification(
                    to_email=assigned_user.email,
                    entity_type="leads",
                    entity_name=f"{successful_imports} imported leads",
                    assigned_by=user.email
                )
            except Exception as email_error:
                # Don't fail the import if email fails
                print(f"Failed to send email notification: {email_error}")
        
        response_data = {
            "message": f"Import completed. {successful_imports} leads imported successfully.",
            "successful_imports": successful_imports,
            "failed_imports": len(failed_imports),
            "failures": failed_imports[:10] if failed_imports else []  # Limit to first 10 failures
        }
        
        if failed_imports:
            response_data["message"] += f" {len(failed_imports)} imports failed."
        
        return jsonify(response_data), 200
        
    except Exception as e:
        session.rollback()
        return jsonify({"error": f"Import failed: {str(e)}"}), 500
    finally:
        session.close()


@imports_bp.route("/leads/template", methods=["GET"])
@requires_auth(roles=["admin"])
async def download_import_template():
    """
    Provide a CSV template for lead imports
    """
    template_data = {
        "OWNER_NAME": ["Example Company LLC"],
        "PLANT_NAME": ["Example Plant Name"],
        "ADDRESS": ["123 Main Street"],
        "CITY": ["Anytown"],
        "STATE": ["Kansas"],
        "PHONE": ["316-555-1234"],
        "SIC_DESC": ["Food Processing"],
        "CONTACT TITLE": ["Plant Manager"],
        "CONTACT FIRST NAME": ["John"],
        "CONTACT LAST NAME": ["Doe"],
        "CONTACT EMAIL": ["john.doe@example.com"]
    }
    
    df = pd.DataFrame(template_data)
    
    # Convert to CSV
    output = io.StringIO()
    df.to_csv(output, index=False)
    csv_content = output.getvalue()
    
    from quart import Response
    return Response(
        csv_content,
        mimetype='text/csv',
        headers={"Content-Disposition": "attachment; filename=lead_import_template.csv"}
    )

@imports_bp.route("/test", methods=["GET"])
@requires_auth(roles=["admin"])
async def test_import_route():
    """
    Simple test route to verify the import blueprint is working
    """
    return jsonify({"message": "Import route is working!", "user": request.user.email}), 200