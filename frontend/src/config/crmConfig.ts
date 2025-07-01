// CRM Configuration - Easily customizable for any business
// This file centralizes all business-specific settings, making the CRM adaptable to any industry

export interface CRMConfig {
  // Company branding
  branding: {
    companyName: string;
    primaryColor: string;
    secondaryColor: string;
    logo?: string;
  };

  // Entity labels (customize for industry)
  labels: {
    client: string;          // "Client", "Account", "Customer", "Company"
    lead: string;           // "Lead", "Prospect", "Opportunity", "Contact"
    project: string;        // "Project", "Deal", "Opportunity", "Job"
    interaction: string;    // "Interaction", "Activity", "Touch", "Contact"
  };

  // Lead management configuration
  leads: {
    statuses: readonly string[];
    statusConfig: {
      colors: Record<string, string>;
      icons: Record<string, string>;
      labels: Record<string, string>;
    };
    sources: readonly string[];
    temperatures: readonly string[];
    temperatureConfig: {
      colors: Record<string, string>;
      icons: Record<string, string>;
    };
    customFields?: Array<{
      key: string;
      label: string;
      type: 'text' | 'select' | 'number' | 'date';
      options?: string[];
      required?: boolean;
    }>;
  };

  // Industry/business types
  businessTypes: readonly string[];

  // Regional settings
  regional: {
    currency: string;
    currencySymbol: string;
    dateFormat: string;
    phoneFormat: string;
    addressFormat: 'US' | 'UK' | 'EU' | 'INTL';
  };

  // Feature toggles
  features: {
    showTemperature: boolean;
    showLeadScore: boolean;
    showSource: boolean;
    enableProjectStandalone: boolean;
    enableBulkOperations: boolean;
    enableAdvancedFilters: boolean;
    enableDataExport: boolean;
  };

  // Default view preferences
  defaults: {
    leadsPerPage: number;
    clientsPerPage: number;
    projectsPerPage: number;
    defaultView: 'cards' | 'table';
    defaultSort: 'newest' | 'oldest' | 'alphabetical';
  };
}

// Default configuration - can be overridden per deployment
export const DEFAULT_CONFIG: CRMConfig = {
  branding: {
    companyName: "PathSix CRM",
    primaryColor: "#2563eb", // blue-600
    secondaryColor: "#64748b", // slate-500
  },

  labels: {
    client: "Client",
    lead: "Lead", 
    project: "Project",
    interaction: "Interaction",
  },

  leads: {
    statuses: ['open', 'qualified', 'proposal', 'won', 'lost'],
    statusConfig: {
      colors: {
        open: 'bg-yellow-100 text-yellow-800',
        qualified: 'bg-orange-100 text-orange-800',
        proposal: 'bg-blue-100 text-blue-800',
        won: 'bg-green-100 text-green-800',
        lost: 'bg-red-100 text-red-800'
      },
      icons: {
        open: '🟡',
        qualified: '🟠', 
        proposal: '🔵',
        won: '🟢',
        lost: '🔴'
      },
      labels: {
        open: 'Open',
        qualified: 'Qualified',
        proposal: 'Proposal',
        won: 'Won',
        lost: 'Lost'
      }
    },
    sources: [
      'Website', 'Referral', 'Cold Call', 'Email Campaign',
      'Social Media', 'Trade Show', 'Advertisement', 'Partner', 'Other'
    ],
    temperatures: ['hot', 'warm', 'cold'],
    temperatureConfig: {
      colors: {
        hot: 'text-red-600',
        warm: 'text-orange-600', 
        cold: 'text-blue-600'
      },
      icons: {
        hot: '🔥',
        warm: '☀️',
        cold: '❄️'
      }
    }
  },

  businessTypes: [
    'None', 'Oil & Gas', 'Secondary Containment', 'Tanks', 'Pipe', 
    'Rental', 'Food and Beverage', 'Bridge', 'Culvert'
  ],

  regional: {
    currency: 'USD',
    currencySymbol: '$',
    dateFormat: 'MM/DD/YYYY',
    phoneFormat: 'US',
    addressFormat: 'US'
  },

  features: {
    showTemperature: true,
    showLeadScore: false,
    showSource: true,
    enableProjectStandalone: true,
    enableBulkOperations: true,
    enableAdvancedFilters: true,
    enableDataExport: true,
  },

  defaults: {
    leadsPerPage: 10,
    clientsPerPage: 10, 
    projectsPerPage: 10,
    defaultView: 'cards',
    defaultSort: 'newest',
  }
};

// Industry preset type - more flexible than strict CRMConfig
interface IndustryPreset {
  branding?: Partial<CRMConfig['branding']>;
  labels?: Partial<CRMConfig['labels']>;
  leads?: {
    statuses?: readonly string[];
    statusConfig?: {
      colors?: Record<string, string>;
      icons?: Record<string, string>;
      labels?: Record<string, string>;
    };
    sources?: readonly string[];
    temperatures?: readonly string[];
    temperatureConfig?: {
      colors?: Record<string, string>;
      icons?: Record<string, string>;
    };
    customFields?: CRMConfig['leads']['customFields'];
  };
  businessTypes?: readonly string[];
  regional?: Partial<CRMConfig['regional']>;
  features?: Partial<CRMConfig['features']>;
  defaults?: Partial<CRMConfig['defaults']>;
}

// Industry-specific presets that can be easily applied
export const INDUSTRY_PRESETS: Record<string, IndustryPreset> = {
  // Manufacturing/Industrial (like PathSix)
  manufacturing: {
    labels: {
      client: "Account",
      lead: "Prospect", 
      project: "Job",
      interaction: "Touch"
    },
    businessTypes: [
      'None', 'Oil & Gas', 'Manufacturing', 'Chemical', 'Food Processing',
      'Automotive', 'Aerospace', 'Construction', 'Mining'
    ],
    leads: {
      sources: [
        'Trade Show', 'Industry Referral', 'Cold Call', 'Website',
        'LinkedIn', 'Industry Publication', 'Partner', 'Existing Customer'
      ],
      statuses: ['inquiry', 'qualified', 'quote_sent', 'negotiating', 'won', 'lost'],
      statusConfig: {
        colors: {
          inquiry: 'bg-gray-100 text-gray-800',
          qualified: 'bg-yellow-100 text-yellow-800',
          quote_sent: 'bg-blue-100 text-blue-800',
          negotiating: 'bg-orange-100 text-orange-800',
          won: 'bg-green-100 text-green-800',
          lost: 'bg-red-100 text-red-800'
        },
        icons: {
          inquiry: '❓',
          qualified: '✅',
          quote_sent: '📄',
          negotiating: '🤝',
          won: '🎉',
          lost: '❌'
        },
        labels: {
          inquiry: 'Inquiry',
          qualified: 'Qualified',
          quote_sent: 'Quote Sent',
          negotiating: 'Negotiating',
          won: 'Won',
          lost: 'Lost'
        }
      }
    }
  },

  // Professional Services
  services: {
    labels: {
      client: "Client",
      lead: "Lead",
      project: "Engagement", 
      interaction: "Meeting"
    },
    businessTypes: [
      'None', 'Legal', 'Accounting', 'Consulting', 'Marketing',
      'IT Services', 'Financial Services', 'Real Estate', 'Healthcare'
    ],
    leads: {
      sources: [
        'Referral', 'Website', 'Networking', 'Social Media',
        'Content Marketing', 'Speaking Event', 'Partner', 'Direct Mail'
      ],
      statuses: ['inquiry', 'consultation', 'proposal', 'won', 'lost'],
      statusConfig: {
        colors: {
          inquiry: 'bg-blue-100 text-blue-800',
          consultation: 'bg-yellow-100 text-yellow-800', 
          proposal: 'bg-orange-100 text-orange-800',
          won: 'bg-green-100 text-green-800',
          lost: 'bg-red-100 text-red-800'
        },
        icons: {
          inquiry: '📞',
          consultation: '👥',
          proposal: '📋',
          won: '✅',
          lost: '❌'
        },
        labels: {
          inquiry: 'Inquiry',
          consultation: 'Consultation',
          proposal: 'Proposal',
          won: 'Won',
          lost: 'Lost'
        }
      }
    }
  },

  // Real Estate
  realestate: {
    labels: {
      client: "Client",
      lead: "Lead",
      project: "Property",
      interaction: "Showing"
    },
    businessTypes: [
      'None', 'Residential', 'Commercial', 'Industrial', 'Land',
      'Multi-Family', 'Retail', 'Office', 'Investment'
    ],
    leads: {
      sources: [
        'Zillow', 'Realtor.com', 'Referral', 'Open House', 'Sign Call',
        'Social Media', 'Website', 'Print Ad', 'Past Client'
      ],
      statuses: ['inquiry', 'qualified', 'showing', 'offer', 'closed', 'lost'],
      statusConfig: {
        colors: {
          inquiry: 'bg-gray-100 text-gray-800',
          qualified: 'bg-yellow-100 text-yellow-800',
          showing: 'bg-blue-100 text-blue-800', 
          offer: 'bg-orange-100 text-orange-800',
          closed: 'bg-green-100 text-green-800',
          lost: 'bg-red-100 text-red-800'
        },
        icons: {
          inquiry: '📞',
          qualified: '✅',
          showing: '🏠',
          offer: '💰',
          closed: '🎉',
          lost: '❌'
        },
        labels: {
          inquiry: 'Inquiry',
          qualified: 'Qualified',
          showing: 'Showing',
          offer: 'Offer',
          closed: 'Closed',
          lost: 'Lost'
        }
      }
    }
  },

  // Technology/SaaS
  technology: {
    labels: {
      client: "Customer",
      lead: "Lead",
      project: "Deal",
      interaction: "Touch"
    },
    businessTypes: [
      'None', 'Enterprise', 'Mid-Market', 'SMB', 'Startup',
      'Government', 'Healthcare', 'Education', 'Non-Profit'
    ],
    leads: {
      sources: [
        'Website', 'Inbound Marketing', 'Cold Email', 'LinkedIn',
        'Webinar', 'Conference', 'Partner', 'Demo Request', 'Trial Signup'
      ],
      statuses: ['mql', 'sql', 'demo', 'trial', 'proposal', 'closed_won', 'closed_lost'],
      statusConfig: {
        colors: {
          mql: 'bg-blue-100 text-blue-800',
          sql: 'bg-indigo-100 text-indigo-800',
          demo: 'bg-purple-100 text-purple-800',
          trial: 'bg-yellow-100 text-yellow-800',
          proposal: 'bg-orange-100 text-orange-800',
          closed_won: 'bg-green-100 text-green-800',
          closed_lost: 'bg-red-100 text-red-800'
        },
        icons: {
          mql: '🎯',
          sql: '✅',
          demo: '🖥️',
          trial: '🔄',
          proposal: '📄',
          closed_won: '🎉',
          closed_lost: '❌'
        },
        labels: {
          mql: 'MQL',
          sql: 'SQL',
          demo: 'Demo',
          trial: 'Trial',
          proposal: 'Proposal',
          closed_won: 'Closed Won',
          closed_lost: 'Closed Lost'
        }
      }
    }
  }
};

// Hook to get current configuration (with environment overrides)
export function useCRMConfig(): CRMConfig {
  // In a real app, this would check environment variables, user settings, etc.
  // For now, return the default config
  return DEFAULT_CONFIG;
}

// Helper to apply an industry preset
export function applyIndustryPreset(industry: keyof typeof INDUSTRY_PRESETS): CRMConfig {
  const preset = INDUSTRY_PRESETS[industry];
  if (!preset) return DEFAULT_CONFIG;
  
  return {
    ...DEFAULT_CONFIG,
    ...preset,
    // Deep merge for nested objects
    branding: { ...DEFAULT_CONFIG.branding, ...preset.branding },
    labels: { ...DEFAULT_CONFIG.labels, ...preset.labels },
    leads: { 
      ...DEFAULT_CONFIG.leads, 
      ...preset.leads,
      statusConfig: preset.leads?.statusConfig ? {
        colors: { ...DEFAULT_CONFIG.leads.statusConfig.colors, ...preset.leads.statusConfig.colors },
        icons: { ...DEFAULT_CONFIG.leads.statusConfig.icons, ...preset.leads.statusConfig.icons },
        labels: { ...DEFAULT_CONFIG.leads.statusConfig.labels, ...preset.leads.statusConfig.labels }
      } : DEFAULT_CONFIG.leads.statusConfig,
      temperatureConfig: preset.leads?.temperatureConfig ? {
        colors: { ...DEFAULT_CONFIG.leads.temperatureConfig.colors, ...preset.leads.temperatureConfig.colors },
        icons: { ...DEFAULT_CONFIG.leads.temperatureConfig.icons, ...preset.leads.temperatureConfig.icons }
      } : DEFAULT_CONFIG.leads.temperatureConfig
    },
    regional: { ...DEFAULT_CONFIG.regional, ...preset.regional },
    features: { ...DEFAULT_CONFIG.features, ...preset.features },
    defaults: { ...DEFAULT_CONFIG.defaults, ...preset.defaults },
  };
}