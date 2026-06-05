export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      projects: {
        Row: {
          id: string;
          project_name: string;
          agent: string;
          channel: string;
          deadline: string;
          status: "Product" | "Finance" | "Contracting" | "Completed";
          description: string | null;
          progress: number;
          assigned_to: string | null;
          priority: string | null;
          finance_status: string | null;
          contracting_status: string | null;
          product_status: string | null;
          notes: string | null;
          user_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_name: string;
          agent: string;
          channel?: string;
          deadline: string;
          status: "Product" | "Finance" | "Contracting" | "Completed";
          description?: string | null;
          progress?: number;
          assigned_to?: string | null;
          priority?: string | null;
          finance_status?: string | null;
          contracting_status?: string | null;
          product_status?: string | null;
          notes?: string | null;
          user_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_name?: string;
          agent?: string;
          channel?: string;
          deadline?: string;
          status?: "Product" | "Finance" | "Contracting" | "Completed";
          description?: string | null;
          progress?: number;
          assigned_to?: string | null;
          priority?: string | null;
          finance_status?: string | null;
          contracting_status?: string | null;
          product_status?: string | null;
          notes?: string | null;
          user_id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "projects_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      project_files: {
        Row: {
          id: string;
          project_id: string;
          user_id: string;
          storage_bucket: string;
          storage_path: string;
          file_name: string;
          file_stage: "PCM" | "Costing" | "Final";
          workflow_slot: number;
          version_number: number;
          uploaded_by: string | null;
          uploaded_at: string;
          is_current_version: boolean;
          deleted_at: string | null;
          deleted_by: string | null;
          file_type: string;
          file_size: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          user_id: string;
          storage_bucket?: string;
          storage_path: string;
          file_name: string;
          file_stage?: "PCM" | "Costing" | "Final";
          workflow_slot?: number;
          version_number?: number;
          uploaded_by?: string | null;
          uploaded_at?: string;
          is_current_version?: boolean;
          deleted_at?: string | null;
          deleted_by?: string | null;
          file_type: string;
          file_size: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          user_id?: string;
          storage_bucket?: string;
          storage_path?: string;
          file_name?: string;
          file_stage?: "PCM" | "Costing" | "Final";
          workflow_slot?: number;
          version_number?: number;
          uploaded_by?: string | null;
          uploaded_at?: string;
          is_current_version?: boolean;
          deleted_at?: string | null;
          deleted_by?: string | null;
          file_type?: string;
          file_size?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "project_files_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_files_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      project_file_audit_events: {
        Row: {
          id: string;
          project_id: string;
          project_file_id: string | null;
          user_id: string;
          actor_label: string | null;
          action:
            | "PCM uploaded"
            | "PCM replaced"
            | "PCM deleted"
            | "Costing uploaded"
            | "Costing replaced"
            | "Costing deleted"
            | "Final uploaded"
            | "Final replaced"
            | "Final deleted";
          file_stage: "PCM" | "Costing" | "Final";
          workflow_slot: number;
          version_number: number | null;
          file_name: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          project_file_id?: string | null;
          user_id: string;
          actor_label?: string | null;
          action:
            | "PCM uploaded"
            | "PCM replaced"
            | "PCM deleted"
            | "Costing uploaded"
            | "Costing replaced"
            | "Costing deleted"
            | "Final uploaded"
            | "Final replaced"
            | "Final deleted";
          file_stage: "PCM" | "Costing" | "Final";
          workflow_slot: number;
          version_number?: number | null;
          file_name?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          project_file_id?: string | null;
          user_id?: string;
          actor_label?: string | null;
          action?:
            | "PCM uploaded"
            | "PCM replaced"
            | "PCM deleted"
            | "Costing uploaded"
            | "Costing replaced"
            | "Costing deleted"
            | "Final uploaded"
            | "Final replaced"
            | "Final deleted";
          file_stage?: "PCM" | "Costing" | "Final";
          workflow_slot?: number;
          version_number?: number | null;
          file_name?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "project_file_audit_events_project_file_id_fkey";
            columns: ["project_file_id"];
            isOneToOne: false;
            referencedRelation: "project_files";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_file_audit_events_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_file_audit_events_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      project_chat_messages: {
        Row: {
          id: string;
          project_id: string;
          user_id: string;
          message_type: "message" | "file_upload";
          body: string;
          file_id: string | null;
          file_name: string | null;
          author_label: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          user_id: string;
          message_type?: "message" | "file_upload";
          body: string;
          file_id?: string | null;
          file_name?: string | null;
          author_label?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          user_id?: string;
          message_type?: "message" | "file_upload";
          body?: string;
          file_id?: string | null;
          file_name?: string | null;
          author_label?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "project_chat_messages_file_id_fkey";
            columns: ["file_id"];
            isOneToOne: false;
            referencedRelation: "project_files";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_chat_messages_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_chat_messages_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
