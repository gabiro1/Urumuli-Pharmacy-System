import { z } from 'zod';

export const startConversationSchema = z.object({
  subject: z.string().min(2, 'Subject is required').max(300),
  message: z.string().min(1, 'Message is required').max(5000),
  contextType: z.enum(['PRESCRIPTION', 'MEDICINE', 'ORDER', 'ALLERGY', 'GENERAL']).optional(),
  contextId: z.string().uuid().optional(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).optional(),
});

export const sendMessageSchema = z.object({
  content: z.string().min(1, 'Message cannot be empty').max(10000),
  attachmentUrl: z.string().url().optional(),
  attachmentType: z.string().max(50).optional(),
  attachmentName: z.string().max(300).optional(),
  isPrivateNote: z.boolean().optional(),
});

export const assignConversationSchema = z.object({
  pharmacistId: z.string().uuid().optional(),
});

export const cannedReplySchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  content: z.string().min(1, 'Content is required').max(5000),
  category: z.string().max(100).optional(),
});
