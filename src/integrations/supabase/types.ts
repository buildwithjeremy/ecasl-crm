export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      email_logs: {
        Row: {
          facility_id: string | null
          id: string
          interpreter_id: string | null
          job_id: string | null
          recipient_email: string
          sent_at: string | null
          status: string | null
          subject: string
          template_name: string | null
        }
        Insert: {
          facility_id?: string | null
          id?: string
          interpreter_id?: string | null
          job_id?: string | null
          recipient_email: string
          sent_at?: string | null
          status?: string | null
          subject: string
          template_name?: string | null
        }
        Update: {
          facility_id?: string | null
          id?: string
          interpreter_id?: string | null
          job_id?: string | null
          recipient_email?: string
          sent_at?: string | null
          status?: string | null
          subject?: string
          template_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_logs_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_logs_interpreter_id_fkey"
            columns: ["interpreter_id"]
            isOneToOne: false
            referencedRelation: "interpreters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_logs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          body: string
          created_at: string | null
          id: string
          name: string
          subject: string
          updated_at: string | null
        }
        Insert: {
          body: string
          created_at?: string | null
          id?: string
          name: string
          subject: string
          updated_at?: string | null
        }
        Update: {
          body?: string
          created_at?: string | null
          id?: string
          name?: string
          subject?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      facilities: {
        Row: {
          billing_address: string | null
          billing_city: string | null
          billing_code: string | null
          billing_contacts: Json | null
          billing_name: string | null
          billing_state: string | null
          billing_zip: string | null
          contract_pdf_url: string | null
          contract_signed_date: string | null
          contract_status: Database["public"]["Enums"]["contract_status"] | null
          contractor: boolean | null
          created_at: string | null
          emergency_fee: number | null
          facility_type: Database["public"]["Enums"]["facility_type"] | null
          holiday_fee: number | null
          id: string
          is_gsa: boolean | null
          minimum_billable_hours: number | null
          name: string
          notes: string | null
          physical_address: string | null
          physical_city: string | null
          physical_state: string | null
          physical_zip: string | null
          rate_after_hours: number | null
          rate_business_hours: number | null
          rate_holiday_hours: number | null
          signed_contract_pdf_url: string | null
          status: Database["public"]["Enums"]["facility_status"] | null
          timezone: string | null
          updated_at: string | null
        }
        Insert: {
          billing_address?: string | null
          billing_city?: string | null
          billing_code?: string | null
          billing_contacts?: Json | null
          billing_name?: string | null
          billing_state?: string | null
          billing_zip?: string | null
          contract_pdf_url?: string | null
          contract_signed_date?: string | null
          contract_status?:
            | Database["public"]["Enums"]["contract_status"]
            | null
          contractor?: boolean | null
          created_at?: string | null
          emergency_fee?: number | null
          facility_type?: Database["public"]["Enums"]["facility_type"] | null
          holiday_fee?: number | null
          id?: string
          is_gsa?: boolean | null
          minimum_billable_hours?: number | null
          name: string
          notes?: string | null
          physical_address?: string | null
          physical_city?: string | null
          physical_state?: string | null
          physical_zip?: string | null
          rate_after_hours?: number | null
          rate_business_hours?: number | null
          rate_holiday_hours?: number | null
          signed_contract_pdf_url?: string | null
          status?: Database["public"]["Enums"]["facility_status"] | null
          timezone?: string | null
          updated_at?: string | null
        }
        Update: {
          billing_address?: string | null
          billing_city?: string | null
          billing_code?: string | null
          billing_contacts?: Json | null
          billing_name?: string | null
          billing_state?: string | null
          billing_zip?: string | null
          contract_pdf_url?: string | null
          contract_signed_date?: string | null
          contract_status?:
            | Database["public"]["Enums"]["contract_status"]
            | null
          contractor?: boolean | null
          created_at?: string | null
          emergency_fee?: number | null
          facility_type?: Database["public"]["Enums"]["facility_type"] | null
          holiday_fee?: number | null
          id?: string
          is_gsa?: boolean | null
          minimum_billable_hours?: number | null
          name?: string
          notes?: string | null
          physical_address?: string | null
          physical_city?: string | null
          physical_state?: string | null
          physical_zip?: string | null
          rate_after_hours?: number | null
          rate_business_hours?: number | null
          rate_holiday_hours?: number | null
          signed_contract_pdf_url?: string | null
          status?: Database["public"]["Enums"]["facility_status"] | null
          timezone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      interpreter_bills: {
        Row: {
          bill_number: string | null
          created_at: string | null
          expenses_amount: number | null
          hours_amount: number | null
          id: string
          interpreter_id: string
          job_id: string
          mileage_amount: number | null
          notes: string | null
          paid_date: string | null
          pay_period_end: string | null
          pay_period_start: string | null
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          payment_reference: string | null
          status: Database["public"]["Enums"]["bill_status"] | null
          total: number | null
          updated_at: string | null
        }
        Insert: {
          bill_number?: string | null
          created_at?: string | null
          expenses_amount?: number | null
          hours_amount?: number | null
          id?: string
          interpreter_id: string
          job_id: string
          mileage_amount?: number | null
          notes?: string | null
          paid_date?: string | null
          pay_period_end?: string | null
          pay_period_start?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          payment_reference?: string | null
          status?: Database["public"]["Enums"]["bill_status"] | null
          total?: number | null
          updated_at?: string | null
        }
        Update: {
          bill_number?: string | null
          created_at?: string | null
          expenses_amount?: number | null
          hours_amount?: number | null
          id?: string
          interpreter_id?: string
          job_id?: string
          mileage_amount?: number | null
          notes?: string | null
          paid_date?: string | null
          pay_period_end?: string | null
          pay_period_start?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          payment_reference?: string | null
          status?: Database["public"]["Enums"]["bill_status"] | null
          total?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "interpreter_bills_interpreter_id_fkey"
            columns: ["interpreter_id"]
            isOneToOne: false
            referencedRelation: "interpreters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interpreter_bills_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      interpreters: {
        Row: {
          address: string | null
          city: string | null
          contract_pdf_url: string | null
          contract_signed_date: string | null
          contract_status: Database["public"]["Enums"]["contract_status"] | null
          created_at: string | null
          eligible_emergency_fee: boolean | null
          eligible_holiday_fee: boolean | null
          email: string
          first_name: string
          id: string
          insurance_end_date: string | null
          last_name: string
          minimum_hours: number | null
          nic_certified: boolean | null
          notes: string | null
          other_certifications: string | null
          payment_details: string | null
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          phone: string | null
          rate_after_hours: number | null
          rate_business_hours: number | null
          rate_holiday_hours: number | null
          rid_certified: boolean | null
          rid_number: string | null
          signed_contract_pdf_url: string | null
          state: string | null
          status: Database["public"]["Enums"]["interpreter_status"] | null
          updated_at: string | null
          w9_received: boolean | null
          w9_received_date: string | null
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          contract_pdf_url?: string | null
          contract_signed_date?: string | null
          contract_status?:
            | Database["public"]["Enums"]["contract_status"]
            | null
          created_at?: string | null
          eligible_emergency_fee?: boolean | null
          eligible_holiday_fee?: boolean | null
          email: string
          first_name: string
          id?: string
          insurance_end_date?: string | null
          last_name: string
          minimum_hours?: number | null
          nic_certified?: boolean | null
          notes?: string | null
          other_certifications?: string | null
          payment_details?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          phone?: string | null
          rate_after_hours?: number | null
          rate_business_hours?: number | null
          rate_holiday_hours?: number | null
          rid_certified?: boolean | null
          rid_number?: string | null
          signed_contract_pdf_url?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["interpreter_status"] | null
          updated_at?: string | null
          w9_received?: boolean | null
          w9_received_date?: string | null
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          contract_pdf_url?: string | null
          contract_signed_date?: string | null
          contract_status?:
            | Database["public"]["Enums"]["contract_status"]
            | null
          created_at?: string | null
          eligible_emergency_fee?: boolean | null
          eligible_holiday_fee?: boolean | null
          email?: string
          first_name?: string
          id?: string
          insurance_end_date?: string | null
          last_name?: string
          minimum_hours?: number | null
          nic_certified?: boolean | null
          notes?: string | null
          other_certifications?: string | null
          payment_details?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          phone?: string | null
          rate_after_hours?: number | null
          rate_business_hours?: number | null
          rate_holiday_hours?: number | null
          rid_certified?: boolean | null
          rid_number?: string | null
          signed_contract_pdf_url?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["interpreter_status"] | null
          updated_at?: string | null
          w9_received?: boolean | null
          w9_received_date?: string | null
          zip_code?: string | null
        }
        Relationships: []
      }
      invoice_items: {
        Row: {
          description: string
          id: string
          invoice_id: string
          job_id: string | null
          quantity: number
          total: number
          unit_price: number
        }
        Insert: {
          description: string
          id?: string
          invoice_id: string
          job_id?: string | null
          quantity: number
          total: number
          unit_price: number
        }
        Update: {
          description?: string
          id?: string
          invoice_id?: string
          job_id?: string | null
          quantity?: number
          total?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          created_at: string | null
          due_date: string | null
          facility_id: string
          id: string
          invoice_number: string
          issued_date: string | null
          job_id: string | null
          notes: string | null
          paid_date: string | null
          pdf_url: string | null
          quickbooks_invoice_id: string | null
          status: Database["public"]["Enums"]["invoice_status"] | null
          subtotal: number | null
          tax: number | null
          total: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          due_date?: string | null
          facility_id: string
          id?: string
          invoice_number: string
          issued_date?: string | null
          job_id?: string | null
          notes?: string | null
          paid_date?: string | null
          pdf_url?: string | null
          quickbooks_invoice_id?: string | null
          status?: Database["public"]["Enums"]["invoice_status"] | null
          subtotal?: number | null
          tax?: number | null
          total?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          due_date?: string | null
          facility_id?: string
          id?: string
          invoice_number?: string
          issued_date?: string | null
          job_id?: string | null
          notes?: string | null
          paid_date?: string | null
          pdf_url?: string | null
          quickbooks_invoice_id?: string | null
          status?: Database["public"]["Enums"]["invoice_status"] | null
          subtotal?: number | null
          tax?: number | null
          total?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          actual_end_time: string | null
          actual_start_time: string | null
          after_hours_worked: number | null
          billable_hours: number | null
          business_hours_worked: number | null
          client_business_name: string | null
          client_contact_email: string | null
          client_contact_name: string | null
          client_contact_phone: string | null
          confirmation_sent_at: string | null
          created_at: string | null
          deaf_client_name: string | null
          emergency_fee_applied: boolean | null
          end_time: string
          facility_billable_total: number | null
          facility_hourly_total: number | null
          facility_id: string
          facility_rate_adjustment: number | null
          facility_rate_after_hours: number | null
          facility_rate_business: number | null
          facility_rate_holiday: number | null
          facility_rate_mileage: number | null
          finalized_at: string | null
          holiday_fee_applied: boolean | null
          id: string
          internal_notes: string | null
          interpreter_billable_total: number | null
          interpreter_hourly_total: number | null
          interpreter_id: string | null
          interpreter_rate_adjustment: number | null
          interpreter_rate_after_hours: number | null
          interpreter_rate_business: number | null
          interpreter_rate_holiday: number | null
          interpreter_rate_mileage: number | null
          invoice_reminder_sent_at: string | null
          job_date: string
          job_number: string | null
          location_address: string | null
          location_city: string | null
          location_state: string | null
          location_type: Database["public"]["Enums"]["job_location_type"] | null
          location_zip: string | null
          mileage: number | null
          misc_fee: number | null
          opportunity_source:
            | Database["public"]["Enums"]["opportunity_source"]
            | null
          parking: number | null
          potential_interpreter_ids: string[] | null
          reminder_sent_at: string | null
          start_time: string
          status: Database["public"]["Enums"]["job_status"] | null
          timezone: string | null
          tolls: number | null
          total_facility_charge: number | null
          total_interpreter_pay: number | null
          travel_time_hours: number | null
          travel_time_rate: number | null
          trilingual_rate_uplift: number | null
          updated_at: string | null
          video_call_link: string | null
        }
        Insert: {
          actual_end_time?: string | null
          actual_start_time?: string | null
          after_hours_worked?: number | null
          billable_hours?: number | null
          business_hours_worked?: number | null
          client_business_name?: string | null
          client_contact_email?: string | null
          client_contact_name?: string | null
          client_contact_phone?: string | null
          confirmation_sent_at?: string | null
          created_at?: string | null
          deaf_client_name?: string | null
          emergency_fee_applied?: boolean | null
          end_time: string
          facility_billable_total?: number | null
          facility_hourly_total?: number | null
          facility_id: string
          facility_rate_adjustment?: number | null
          facility_rate_after_hours?: number | null
          facility_rate_business?: number | null
          facility_rate_holiday?: number | null
          facility_rate_mileage?: number | null
          finalized_at?: string | null
          holiday_fee_applied?: boolean | null
          id?: string
          internal_notes?: string | null
          interpreter_billable_total?: number | null
          interpreter_hourly_total?: number | null
          interpreter_id?: string | null
          interpreter_rate_adjustment?: number | null
          interpreter_rate_after_hours?: number | null
          interpreter_rate_business?: number | null
          interpreter_rate_holiday?: number | null
          interpreter_rate_mileage?: number | null
          invoice_reminder_sent_at?: string | null
          job_date: string
          job_number?: string | null
          location_address?: string | null
          location_city?: string | null
          location_state?: string | null
          location_type?:
            | Database["public"]["Enums"]["job_location_type"]
            | null
          location_zip?: string | null
          mileage?: number | null
          misc_fee?: number | null
          opportunity_source?:
            | Database["public"]["Enums"]["opportunity_source"]
            | null
          parking?: number | null
          potential_interpreter_ids?: string[] | null
          reminder_sent_at?: string | null
          start_time: string
          status?: Database["public"]["Enums"]["job_status"] | null
          timezone?: string | null
          tolls?: number | null
          total_facility_charge?: number | null
          total_interpreter_pay?: number | null
          travel_time_hours?: number | null
          travel_time_rate?: number | null
          trilingual_rate_uplift?: number | null
          updated_at?: string | null
          video_call_link?: string | null
        }
        Update: {
          actual_end_time?: string | null
          actual_start_time?: string | null
          after_hours_worked?: number | null
          billable_hours?: number | null
          business_hours_worked?: number | null
          client_business_name?: string | null
          client_contact_email?: string | null
          client_contact_name?: string | null
          client_contact_phone?: string | null
          confirmation_sent_at?: string | null
          created_at?: string | null
          deaf_client_name?: string | null
          emergency_fee_applied?: boolean | null
          end_time?: string
          facility_billable_total?: number | null
          facility_hourly_total?: number | null
          facility_id?: string
          facility_rate_adjustment?: number | null
          facility_rate_after_hours?: number | null
          facility_rate_business?: number | null
          facility_rate_holiday?: number | null
          facility_rate_mileage?: number | null
          finalized_at?: string | null
          holiday_fee_applied?: boolean | null
          id?: string
          internal_notes?: string | null
          interpreter_billable_total?: number | null
          interpreter_hourly_total?: number | null
          interpreter_id?: string | null
          interpreter_rate_adjustment?: number | null
          interpreter_rate_after_hours?: number | null
          interpreter_rate_business?: number | null
          interpreter_rate_holiday?: number | null
          interpreter_rate_mileage?: number | null
          invoice_reminder_sent_at?: string | null
          job_date?: string
          job_number?: string | null
          location_address?: string | null
          location_city?: string | null
          location_state?: string | null
          location_type?:
            | Database["public"]["Enums"]["job_location_type"]
            | null
          location_zip?: string | null
          mileage?: number | null
          misc_fee?: number | null
          opportunity_source?:
            | Database["public"]["Enums"]["opportunity_source"]
            | null
          parking?: number | null
          potential_interpreter_ids?: string[] | null
          reminder_sent_at?: string | null
          start_time?: string
          status?: Database["public"]["Enums"]["job_status"] | null
          timezone?: string | null
          tolls?: number | null
          total_facility_charge?: number | null
          total_interpreter_pay?: number | null
          travel_time_hours?: number | null
          travel_time_rate?: number | null
          trilingual_rate_uplift?: number | null
          updated_at?: string | null
          video_call_link?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jobs_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_interpreter_id_fkey"
            columns: ["interpreter_id"]
            isOneToOne: false
            referencedRelation: "interpreters"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string
          first_name: string | null
          id: string
          last_name: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          first_name?: string | null
          id: string
          last_name?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      settings: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          key: string
          updated_at: string | null
          value: Json
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          key: string
          updated_at?: string | null
          value: Json
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          key?: string
          updated_at?: string | null
          value?: Json
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_team_member: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "gsa_contributor" | "bookkeeper"
      bill_status: "queued" | "paid"
      contract_status: "not_sent" | "sent" | "signed"
      facility_status: "active" | "inactive" | "pending"
      facility_type:
        | "hospital"
        | "clinic"
        | "school"
        | "government"
        | "business"
        | "other"
      interpreter_status: "active" | "inactive" | "pending"
      invoice_status: "draft" | "submitted" | "paid"
      job_location_type: "in_person" | "remote"
      job_status:
        | "new"
        | "outreach_in_progress"
        | "confirmed"
        | "complete"
        | "ready_to_bill"
        | "billed"
        | "paid"
        | "cancelled"
      opportunity_source:
        | "direct"
        | "agency"
        | "gsa"
        | "referral"
        | "repeat"
        | "other"
      payment_method: "zelle" | "check"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "gsa_contributor", "bookkeeper"],
      bill_status: ["queued", "paid"],
      contract_status: ["not_sent", "sent", "signed"],
      facility_status: ["active", "inactive", "pending"],
      facility_type: [
        "hospital",
        "clinic",
        "school",
        "government",
        "business",
        "other",
      ],
      interpreter_status: ["active", "inactive", "pending"],
      invoice_status: ["draft", "submitted", "paid"],
      job_location_type: ["in_person", "remote"],
      job_status: [
        "new",
        "outreach_in_progress",
        "confirmed",
        "complete",
        "ready_to_bill",
        "billed",
        "paid",
        "cancelled",
      ],
      opportunity_source: [
        "direct",
        "agency",
        "gsa",
        "referral",
        "repeat",
        "other",
      ],
      payment_method: ["zelle", "check"],
    },
  },
} as const
