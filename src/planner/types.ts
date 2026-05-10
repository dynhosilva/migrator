export type Confidence   = 'high' | 'medium' | 'low' | 'unknown';
export type RiskLevel    = 'critical' | 'high' | 'medium' | 'low';
export type DeployTarget = 'static' | 'node-server' | 'docker' | 'edge' | 'unknown';

export interface Risk {
  readonly level: RiskLevel;
  readonly message: string;
  readonly suggestion?: string;
}

export interface ChecklistItem {
  readonly id: string;
  readonly label: string;
  readonly required: boolean;
  readonly notes?: string;
}

export interface CompatibilityResult {
  readonly canDeployStatic: boolean;
  readonly canDeployServer: boolean;
  readonly confidence: Confidence;
  readonly reasons: string[];
}

export interface InfrastructureResult {
  readonly requiresSupabase: boolean;
  readonly requiresDatabase: boolean;
  readonly requiresObjectStorage: boolean;
  readonly requiresServerlessEdge: boolean;
  readonly requiresNodeServer: boolean;
  readonly notes: string[];
}

export interface EnvResult {
  readonly required: string[];
  readonly optional: string[];
  readonly missing: string[];
  readonly warnings: string[];
}

export interface SupabasePlanResult {
  readonly requiresOwnInstance: boolean;
  readonly requiresMigrations: boolean;
  readonly requiresEdgeFunctions: boolean;
  readonly requiresAuth: boolean;
  readonly requiresStorage: boolean;
  readonly requiresRealtime: boolean;
  readonly manualSteps: string[];
  readonly warnings: string[];
}

export interface DeployStrategyResult {
  readonly recommended: DeployTarget;
  readonly alternatives: DeployTarget[];
  readonly confidence: Confidence;
  readonly reasoning: string;
  readonly notes: string[];
}

export interface MigrationPlan {
  readonly projectName: string;
  readonly compatibility: CompatibilityResult;
  readonly infrastructure: InfrastructureResult;
  readonly env: EnvResult;
  readonly supabase: SupabasePlanResult;
  readonly deployStrategy: DeployStrategyResult;
  readonly risks: Risk[];
  readonly checklist: ChecklistItem[];
  readonly warnings: string[];
  readonly plannedAt: string;
}
