export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type WorkspaceRole =
  | "owner"
  | "finance_manager"
  | "accountant"
  | "viewer";
export type InvoiceStatus =
  | "draft"
  | "approved"
  | "paid"
  | "partially_paid"
  | "overdue";
export type InvoiceSource = "upload" | "email";
export type PaymentSource = "stripe" | "manual";
export type PaymentStatus = "pending" | "completed" | "refunded" | "disputed";
export type PaymentMatchMethod = "auto" | "manual";
export type AlertType =
  | "upcoming_due"
  | "overdue"
  | "variance"
  | "low_cash_risk";
export type AlertChannel = "email" | "in_app";
export type AlertStatus = "pending" | "sent" | "failed";
export type InvoiceType = "receivable" | "payable";

export interface Database {
  public: {
    Tables: {
      workspaces: {
        Row: {
          id: string;
          name: string;
          currency: string;
          timezone: string;
          fiscal_year: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          currency?: string;
          timezone?: string;
          fiscal_year?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          currency?: string;
          timezone?: string;
          fiscal_year?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_profiles: {
        Row: {
          id: string;
          email: string;
          name: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_profiles_id_fkey";
            columns: ["id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      workspace_members: {
        Row: {
          id: string;
          workspace_id: string;
          user_id: string;
          role: WorkspaceRole;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          user_id: string;
          role?: WorkspaceRole;
          created_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          user_id?: string;
          role?: WorkspaceRole;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey";
            columns: ["workspace_id"];
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "workspace_members_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      vendors: {
        Row: {
          id: string;
          workspace_id: string;
          name: string;
          tax_id: string | null;
          default_category: string | null;
          terms: string | null;
          contact_email: string | null;
          contact_phone: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          name: string;
          tax_id?: string | null;
          default_category?: string | null;
          terms?: string | null;
          contact_email?: string | null;
          contact_phone?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          name?: string;
          tax_id?: string | null;
          default_category?: string | null;
          terms?: string | null;
          contact_email?: string | null;
          contact_phone?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "vendors_workspace_id_fkey";
            columns: ["workspace_id"];
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          }
        ];
      };
      categories: {
        Row: {
          workspace_id: string;
          code: string;
          name: string;
          parent_code: string | null;
          gl_hint: string | null;
          created_at: string;
        };
        Insert: {
          workspace_id: string;
          code: string;
          name: string;
          parent_code?: string | null;
          gl_hint?: string | null;
          created_at?: string;
        };
        Update: {
          workspace_id?: string;
          code?: string;
          name?: string;
          parent_code?: string | null;
          gl_hint?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "categories_workspace_id_fkey";
            columns: ["workspace_id"];
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          }
        ];
      };
      category_rules: {
        Row: {
          id: string;
          workspace_id: string;
          condition: string;
          outcome: string;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          condition: string;
          outcome: string;
          created_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          condition?: string;
          outcome?: string;
          created_by?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "category_rules_workspace_id_fkey";
            columns: ["workspace_id"];
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "category_rules_created_by_fkey";
            columns: ["created_by"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      invoices: {
        Row: {
          id: string;
          workspace_id: string;
          vendor_id: string;
          invoice_no: string;
          issue_date: string;
          due_date: string;
          currency: string;
          subtotal: number;
          tax_total: number;
          total: number;
          status: InvoiceStatus;
          confidence: number | null;
          source: InvoiceSource;
          duplicate_of: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
          invoice_type: InvoiceType;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          vendor_id: string;
          invoice_no: string;
          issue_date: string;
          due_date: string;
          currency?: string;
          subtotal?: number;
          tax_total?: number;
          total?: number;
          status?: InvoiceStatus;
          confidence?: number | null;
          source?: InvoiceSource;
          duplicate_of?: string | null;
          created_by: string;
          created_at?: string;
          updated_at?: string;
          invoice_type: InvoiceType;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          vendor_id?: string;
          invoice_no?: string;
          issue_date?: string;
          due_date?: string;
          currency?: string;
          subtotal?: number;
          tax_total?: number;
          total?: number;
          status?: InvoiceStatus;
          confidence?: number | null;
          source?: InvoiceSource;
          duplicate_of?: string | null;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
          invoice_type?: InvoiceType;
        };
        Relationships: [
          {
            foreignKeyName: "invoices_workspace_id_fkey";
            columns: ["workspace_id"];
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invoices_vendor_id_fkey";
            columns: ["vendor_id"];
            referencedRelation: "vendors";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invoices_duplicate_of_fkey";
            columns: ["duplicate_of"];
            referencedRelation: "invoices";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invoices_created_by_fkey";
            columns: ["created_by"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      invoice_lines: {
        Row: {
          id: string;
          invoice_id: string;
          description: string;
          qty: number;
          unit_price: number;
          tax_percent: number;
          line_total: number;
          category_code: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          invoice_id: string;
          description: string;
          qty?: number;
          unit_price?: number;
          tax_percent?: number;
          line_total?: number;
          category_code?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          invoice_id?: string;
          description?: string;
          qty?: number;
          unit_price?: number;
          tax_percent?: number;
          line_total?: number;
          category_code?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "invoice_lines_invoice_id_fkey";
            columns: ["invoice_id"];
            referencedRelation: "invoices";
            referencedColumns: ["id"];
          }
        ];
      };
      payments: {
        Row: {
          id: string;
          workspace_id: string;
          source: PaymentSource;
          external_id: string | null;
          customer: string | null;
          amount: number;
          fee: number | null;
          net: number;
          currency: string;
          received_at: string;
          status: PaymentStatus;
          raw: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          source: PaymentSource;
          external_id?: string | null;
          customer?: string | null;
          amount: number;
          fee?: number | null;
          net: number;
          currency?: string;
          received_at: string;
          status?: PaymentStatus;
          raw?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          source?: PaymentSource;
          external_id?: string | null;
          customer?: string | null;
          amount?: number;
          fee?: number | null;
          net?: number;
          currency?: string;
          received_at?: string;
          status?: PaymentStatus;
          raw?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payments_workspace_id_fkey";
            columns: ["workspace_id"];
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          }
        ];
      };
      payment_matches: {
        Row: {
          id: string;
          workspace_id: string;
          invoice_id: string;
          payment_id: string;
          score: number;
          method: PaymentMatchMethod;
          reason: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          invoice_id: string;
          payment_id: string;
          score?: number;
          method?: PaymentMatchMethod;
          reason?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          invoice_id?: string;
          payment_id?: string;
          score?: number;
          method?: PaymentMatchMethod;
          reason?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payment_matches_workspace_id_fkey";
            columns: ["workspace_id"];
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payment_matches_invoice_id_fkey";
            columns: ["invoice_id"];
            referencedRelation: "invoices";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payment_matches_payment_id_fkey";
            columns: ["payment_id"];
            referencedRelation: "payments";
            referencedColumns: ["id"];
          }
        ];
      };
      alerts: {
        Row: {
          id: string;
          workspace_id: string;
          type: AlertType;
          payload: Json;
          scheduled_at: string;
          sent_at: string | null;
          channel: AlertChannel;
          status: AlertStatus;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          type: AlertType;
          payload: Json;
          scheduled_at: string;
          sent_at?: string | null;
          channel?: AlertChannel;
          status?: AlertStatus;
          created_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          type?: AlertType;
          payload?: Json;
          scheduled_at?: string;
          sent_at?: string | null;
          channel?: AlertChannel;
          status?: AlertStatus;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "alerts_workspace_id_fkey";
            columns: ["workspace_id"];
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          }
        ];
      };
      audit_logs: {
        Row: {
          id: string;
          workspace_id: string;
          actor_id: string;
          action: string;
          entity: string;
          entity_id: string | null;
          diff: Json | null;
          at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          actor_id: string;
          action: string;
          entity: string;
          entity_id?: string | null;
          diff?: Json | null;
          at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          actor_id?: string;
          action?: string;
          entity?: string;
          entity_id?: string | null;
          diff?: Json | null;
          at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "audit_logs_workspace_id_fkey";
            columns: ["workspace_id"];
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "audit_logs_actor_id_fkey";
            columns: ["actor_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      workspace_role: WorkspaceRole;
      invoice_status: InvoiceStatus;
      invoice_source: InvoiceSource;
      payment_source: PaymentSource;
      payment_status: PaymentStatus;
      payment_match_method: PaymentMatchMethod;
      alert_type: AlertType;
      alert_channel: AlertChannel;
      alert_status: AlertStatus;
      invoice_type: InvoiceType;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

// Helper types for easier usage
export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];

export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];

// Specific table types
export type Workspace = Tables<"workspaces">;
export type WorkspaceInsert = TablesInsert<"workspaces">;
export type WorkspaceUpdate = TablesUpdate<"workspaces">;

export type UserProfile = Tables<"user_profiles">;
export type UserProfileInsert = TablesInsert<"user_profiles">;
export type UserProfileUpdate = TablesUpdate<"user_profiles">;

export type WorkspaceMember = Tables<"workspace_members">;
export type WorkspaceMemberInsert = TablesInsert<"workspace_members">;
export type WorkspaceMemberUpdate = TablesUpdate<"workspace_members">;

export type Vendor = Tables<"vendors">;
export type VendorInsert = TablesInsert<"vendors">;
export type VendorUpdate = TablesUpdate<"vendors">;

export type Category = Tables<"categories">;
export type CategoryInsert = TablesInsert<"categories">;
export type CategoryUpdate = TablesUpdate<"categories">;

export type CategoryRule = Tables<"category_rules">;
export type CategoryRuleInsert = TablesInsert<"category_rules">;
export type CategoryRuleUpdate = TablesUpdate<"category_rules">;

export type Invoice = Tables<"invoices">;
export type InvoiceInsert = TablesInsert<"invoices">;
export type InvoiceUpdate = TablesUpdate<"invoices">;

export type InvoiceLine = Tables<"invoice_lines">;
export type InvoiceLineInsert = TablesInsert<"invoice_lines">;
export type InvoiceLineUpdate = TablesUpdate<"invoice_lines">;

export type Payment = Tables<"payments">;
export type PaymentInsert = TablesInsert<"payments">;
export type PaymentUpdate = TablesUpdate<"payments">;

export type PaymentMatch = Tables<"payment_matches">;
export type PaymentMatchInsert = TablesInsert<"payment_matches">;
export type PaymentMatchUpdate = TablesUpdate<"payment_matches">;

export type Alert = Tables<"alerts">;
export type AlertInsert = TablesInsert<"alerts">;
export type AlertUpdate = TablesUpdate<"alerts">;

export type AuditLog = Tables<"audit_logs">;
export type AuditLogInsert = TablesInsert<"audit_logs">;
export type AuditLogUpdate = TablesUpdate<"audit_logs">;
