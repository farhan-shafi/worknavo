import { z } from 'zod';

const optionalText = (maximum: number) =>
  z.string().trim().max(maximum).optional();

export const clientFormSchema = z.object({
  name: z.string().trim().min(2, 'Enter the client name.').max(100),
  companyName: optionalText(150),
  email: z.string().trim().email('Enter a valid email address.').max(254),
  phone: optionalText(40),
  website: optionalText(300).refine((value) => {
    if (!value) return true;

    return z
      .string()
      .url()
      .safeParse(
        value.startsWith('http://') || value.startsWith('https://')
          ? value
          : `https://${value}`,
      ).success;
  }, 'Enter a valid website address.'),
  address: optionalText(500),
  status: z.enum(['active', 'inactive', 'archived']),
  notes: optionalText(3000),
});

export type ClientFormValues = z.infer<typeof clientFormSchema>;
