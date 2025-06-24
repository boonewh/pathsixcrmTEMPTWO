from quart import Blueprint, request, jsonify
from datetime import datetime
from app.models import Project, ActivityLog, ActivityType, Client, Lead
from app.database import SessionLocal
from app.utils.auth_utils import requires_auth
from app.constants import PROJECT_STATUS_OPTIONS
from sqlalchemy.orm import joinedload
from sqlalchemy import or_

projects_bp = Blueprint("projects", __name__, url_prefix="/api/projects")

def parse_date_with_default_time(value):
    if not value:
        return None
    try:
        return datetime.fromisoformat(value)
    except ValueError:
        try:
            return datetime.fromisoformat(value + "T00:00:00")
        except ValueError:
            return None

@projects_bp.route("/", methods=["GET"])
@requires_auth()
async def list_projects():
    user = request.user
    session = SessionLocal()
    try:
        projects = session.query(Project).options(
            joinedload(Project.client),
            joinedload(Project.lead)
        ).filter(
            Project.tenant_id == user.tenant_id,
            Project.created_by == user.id
        ).all()

        return jsonify([
            {
                "id": p.id,
                "project_name": p.project_name,
                "type": p.type,
                "project_status": p.project_status,
                "project_description": p.project_description,
                "notes": p.notes,
                "project_start": p.project_start.isoformat() if p.project_start else None,
                "project_end": p.project_end.isoformat() if p.project_end else None,
                "project_worth": p.project_worth,
                "client_id": p.client_id,
                "lead_id": p.lead_id,
                "client_name": p.client.name if p.client else None,
                "lead_name": p.lead.name if p.lead else None,
                "created_at": p.created_at.isoformat() if p.created_at else None
            } for p in projects
        ])
    finally:
        session.close()



@projects_bp.route("/<int:project_id>", methods=["GET"])
@requires_auth()
async def get_project(project_id):
    user = request.user
    session = SessionLocal()
    try:
        project = session.query(Project).options(
            joinedload(Project.client),
            joinedload(Project.lead)
        ).filter(
            Project.id == project_id,
            Project.tenant_id == user.tenant_id
        ).first()

        if not project:
            return jsonify({"error": "Project not found"}), 404

        log = ActivityLog(
            tenant_id=user.tenant_id,
            user_id=user.id,
            action=ActivityType.viewed,
            entity_type="project",
            entity_id=project.id,
            description=f"Viewed project '{project.project_name}'"
        )
        session.add(log)
        session.commit()

        return jsonify({
            "id": project.id,
            "project_name": project.project_name,
            "type": project.type,
            "project_status": project.project_status,
            "project_description": project.project_description,
            "notes": project.notes,
            "project_start": project.project_start.isoformat() + "Z" if project.project_start else None,
            "project_end": project.project_end.isoformat() + "Z" if project.project_end else None,
            "project_worth": project.project_worth,
            "client_id": project.client_id,
            "lead_id": project.lead_id,
            "client_name": project.client.name if project.client else None,
            "lead_name": project.lead.name if project.lead else None,
            "created_by": project.created_by,
            "created_at": project.created_at.isoformat() + "Z" if project.created_at else None,
        })
    finally:
        session.close()


@projects_bp.route("/", methods=["POST"])
@requires_auth()
async def create_project():
    user = request.user
    data = await request.get_json()
    session = SessionLocal()

    try:
        status = data.get("project_status", PROJECT_STATUS_OPTIONS[0])
        if status not in PROJECT_STATUS_OPTIONS:
            status = PROJECT_STATUS_OPTIONS[0]

        project = Project(
            tenant_id=user.tenant_id,
            client_id=data.get("client_id"),
            lead_id=data.get("lead_id"),
            project_name=data["project_name"],
            type=data.get("type", "None"),
            project_status=status,
            project_description=data.get("project_description"),
            notes=data.get("notes"),
            project_start=parse_date_with_default_time(data.get("project_start")),
            project_end=parse_date_with_default_time(data.get("project_end")),
            project_worth=data.get("project_worth"),
            created_by=user.id,
            created_at=datetime.utcnow()
        )
        session.add(project)
        session.commit()
        session.refresh(project)

        return jsonify({
            "id": project.id,
            "project_name": project.project_name,
            "type": project.type,
            "project_status": project.project_status,
            "client_name": project.client.name if project.client else None,
            "lead_name": project.lead.name if project.lead else None,
        }), 201
    finally:
        session.close()


@projects_bp.route("/<int:project_id>", methods=["PUT"])
@requires_auth()
async def update_project(project_id):
    user = request.user
    data = await request.get_json()
    session = SessionLocal()
    try:
        project = session.query(Project).filter(
            Project.id == project_id,
            Project.tenant_id == user.tenant_id
        ).first()

        if not project:
            return jsonify({"error": "Project not found"}), 404

        for field in [
            "project_name", "type", "project_description", "project_worth", "client_id", "lead_id", "notes"
        ]:
            if field in data:
                setattr(project, field, data[field])

        if "project_status" in data:
            status = data["project_status"]
            if status in PROJECT_STATUS_OPTIONS:
                project.project_status = status

        if "project_start" in data:
            project.project_start = parse_date_with_default_time(data["project_start"])
        if "project_end" in data:
            project.project_end = parse_date_with_default_time(data["project_end"])

        session.commit()
        session.refresh(project)
        return jsonify({
            "id": project.id,
            "project_name": project.project_name,
            "type": project.type,
            "project_status": project.project_status,
            "client_name": project.client.name if project.client else None,
            "lead_name": project.lead.name if project.lead else None,
        })
    finally:
        session.close()



@projects_bp.route("/<int:project_id>", methods=["DELETE"])
@requires_auth()
async def delete_project(project_id):
    user = request.user
    session = SessionLocal()
    try:
        project = session.query(Project).filter(
            Project.id == project_id,
            Project.tenant_id == user.tenant_id
        ).first()

        if not project:
            return jsonify({"error": "Project not found"}), 404

        session.delete(project)
        session.commit()
        return jsonify({"message": "Project deleted"})
    finally:
        session.close()


@projects_bp.route("/all", methods=["GET"])
@requires_auth(roles=["admin"])
async def list_all_projects():
    user = request.user
    session = SessionLocal()
    try:
        projects = session.query(Project).options(
            joinedload(Project.client).joinedload(Client.assigned_user),
            joinedload(Project.client).joinedload(Client.created_by_user),
            joinedload(Project.lead).joinedload(Lead.assigned_user),
            joinedload(Project.lead).joinedload(Lead.created_by_user),
        ).filter(
            Project.tenant_id == user.tenant_id
        ).all()

        results = []
        for p in projects:
            assigned_to_email = None
            if p.client and p.client.assigned_user:
                assigned_to_email = p.client.assigned_user.email
            elif p.client and p.client.created_by_user:
                assigned_to_email = p.client.created_by_user.email
            elif p.lead and p.lead.assigned_user:
                assigned_to_email = p.lead.assigned_user.email
            elif p.lead and p.lead.created_by_user:
                assigned_to_email = p.lead.created_by_user.email

            results.append({
                "id": p.id,
                "project_name": p.project_name,
                "type": p.type,
                "project_status": p.project_status,
                "project_description": p.project_description,
                "notes": p.notes,
                "project_start": p.project_start.isoformat() if p.project_start else None,
                "project_end": p.project_end.isoformat() if p.project_end else None,
                "project_worth": p.project_worth,
                "client_id": p.client_id,
                "lead_id": p.lead_id,
                "client_name": p.client.name if p.client else None,
                "lead_name": p.lead.name if p.lead else None,
                "assigned_to_email": assigned_to_email,
                "created_at": p.created_at.isoformat() if p.created_at else None
            })

        return jsonify(results)
    finally:
        session.close()



@projects_bp.route("/by-client/<int:client_id>", methods=["GET"])
@requires_auth()
async def list_projects_by_client(client_id):
    user = request.user
    session = SessionLocal()
    try:
        # Only allow access if the client is visible to the user
        client = session.query(Client).filter(
            Client.id == client_id,
            Client.tenant_id == user.tenant_id,
            Client.deleted_at == None,
        ).first()

        if not client:
            return jsonify({"error": "Client not found"}), 404

        # If not admin, restrict based on assignment/ownership
        if not any(role.name == "admin" for role in user.roles):
            if client.assigned_to != user.id and client.created_by != user.id:
                return jsonify({"error": "Forbidden"}), 403

        projects = session.query(Project).filter(
            Project.client_id == client_id,
            Project.tenant_id == user.tenant_id
        ).order_by(Project.created_at.desc()).all()

        return jsonify([
            {
                "id": p.id,
                "type": p.type,
                "project_name": p.project_name,
                "project_status": p.project_status,
                "project_description": p.project_description,
                "notes": p.notes,
                "project_start": p.project_start.isoformat() if p.project_start else None,
                "project_end": p.project_end.isoformat() if p.project_end else None,
                "project_worth": p.project_worth,
                "created_at": p.created_at.isoformat() if p.created_at else None,
            } for p in projects
        ])
    finally:
        session.close()

@projects_bp.route("/by-lead/<int:lead_id>", methods=["GET"])
@requires_auth()
async def list_projects_by_lead(lead_id):
    user = request.user
    session = SessionLocal()
    try:
        lead = session.query(Lead).filter(
            Lead.id == lead_id,
            Lead.tenant_id == user.tenant_id,
            Lead.deleted_at == None,
        ).first()

        if not lead:
            return jsonify({"error": "Lead not found"}), 404

        if not any(role.name == "admin" for role in user.roles):
            if lead.assigned_to != user.id and lead.created_by != user.id:
                return jsonify({"error": "Forbidden"}), 403

        projects = session.query(Project).filter(
            Project.lead_id == lead_id,
            Project.tenant_id == user.tenant_id
        ).order_by(Project.created_at.desc()).all()

        return jsonify([
            {
                "id": p.id,
                "project_name": p.project_name,
                "type": p.type,
                "project_status": p.project_status,
                "project_description": p.project_description,
                "notes": p.notes,
                "project_start": p.project_start.isoformat() if p.project_start else None,
                "project_end": p.project_end.isoformat() if p.project_end else None,
                "project_worth": p.project_worth,
                "created_at": p.created_at.isoformat() if p.created_at else None,
            } for p in projects
        ])
    finally:
        session.close()