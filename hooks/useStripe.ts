import { useMutation } from "@tanstack/react-query";
import apiClient from "@/lib/api/client";

export interface CreatePaymentIntentPayload {
  amount: number;
  currency: string;
  workspace_id: string;
  invoice_id?: string;
  customer_email?: string;
  description?: string;
}

export interface CreatePaymentIntentResponse {
  clientSecret: string;
  paymentIntentId: string;
}

export const useCreatePaymentIntent = () => {
  return useMutation({
    mutationFn: async (payload: CreatePaymentIntentPayload) => {
      const { data } = await apiClient.post<CreatePaymentIntentResponse>(
        "/stripe/create-payment-intent",
        payload
      );
      return data;
    },
  });
};

export interface CreatePaymentLinkPayload {
  amount: number;
  currency: string;
  workspace_id: string;
  invoice_id?: string;
  customer_email?: string;
  description?: string;
}

export interface CreatePaymentLinkResponse {
  paymentLink: string;
  paymentLinkId: string;
}

export const useCreatePaymentLink = () => {
  return useMutation({
    mutationFn: async (payload: CreatePaymentLinkPayload) => {
      const { data } = await apiClient.post<CreatePaymentLinkResponse>(
        "/stripe/create-payment-link",
        payload
      );
      return data;
    },
  });
};
