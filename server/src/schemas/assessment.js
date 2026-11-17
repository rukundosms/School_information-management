// schemas/assessment.js
const { z } = require('zod');

const questionSchema = z.object({
  question_type: z.enum(['multiple_choice', 'true_false', 'short_answer', 'essay', 'matching']),
  question_text: z.string().min(3).max(5000),
  option_a: z.string().max(1000).optional().default(''),
  option_b: z.string().max(1000).optional().default(''),
  option_c: z.string().max(1000).optional().default(''),
  option_d: z.string().max(1000).optional().default(''),
  correct_answer: z.string().max(2000),
  marks: z.coerce.number().int().min(1).max(100),
}).refine(
  (q) => q.question_type !== 'multiple_choice' || (q.option_a && q.option_b && ['A', 'B', 'C', 'D'].includes(q.correct_answer)),
  { message: 'MCQ requires options A/B and correct_answer to be A/B/C/D' }
);

const submitSchema = z.object({
  answers: z.array(z.object({
    qid: z.coerce.number().int().positive(),
    user_answer: z.string().max(10000).default(''),
    user_letter: z.string().max(10).default(''),
  })).min(0),
});

const heartbeatSchema = z.object({
  warnings: z.coerce.number().int().min(0).default(0),
  elapsed: z.coerce.number().int().min(0).default(0),
});

module.exports = { questionSchema, submitSchema, heartbeatSchema };