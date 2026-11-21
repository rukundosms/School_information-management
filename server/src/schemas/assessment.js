
const { z } = require('zod');

// Supported question types from the database
const questionSchema = z.object({
  question_type: z.enum([
    'multiple_choice',
    'true_false',
    'short_answer',
    'long_answer',
    'matching',
    'fill_blank',
    'essay'
  ]),

  question_text: z.string().trim().min(3).max(5000),

  option_a: z.string().max(1000).optional().nullable().default(''),
  option_b: z.string().max(1000).optional().nullable().default(''),
  option_c: z.string().max(1000).optional().nullable().default(''),
  option_d: z.string().max(1000).optional().nullable().default(''),
  option_e: z.string().max(1000).optional().nullable().default(''),

  correct_answer: z.string().max(2000).optional().nullable().default(''),

  marks: z.coerce.number().min(0).max(1000),

  required: z.coerce.boolean().optional().default(true),

  points_per_answer: z.coerce.number().min(0).max(999.99).optional().default(1),

  image_url: z.string().max(500).optional().nullable().default(''),

  validation_rules: z.string().optional().nullable().default(''),

  display_order: z.coerce.number().int().min(0).optional().default(0),

  matching_pairs: z.string().optional().nullable().default('')
}).refine(
  (q) => {
    if (q.question_type !== 'multiple_choice') return true;

    const options = [
      q.option_a,
      q.option_b,
      q.option_c,
      q.option_d,
      q.option_e
    ];

    return (
      options.filter(value => value && value.trim()).length >= 2 &&
      ['A', 'B', 'C', 'D', 'E'].includes(
        String(q.correct_answer || '').trim().toUpperCase()
      )
    );
  },
  {
    message: 'Multiple choice questions require at least two options and a correct answer from A to E.'
  }
);

const bulkQuestionSchema = z.object({
  questions: z.array(questionSchema).min(1).max(500)
});

const submitSchema = z.object({
  answers: z.array(z.object({
    qid: z.coerce.number().int().positive(),
    user_answer: z.string().max(10000).default(''),
    user_letter: z.string().max(10).default('')
  })).min(0)
});

const heartbeatSchema = z.object({
  warnings: z.coerce.number().int().min(0).default(0),
  elapsed: z.coerce.number().int().min(0).default(0)
});

module.exports = {
  questionSchema,
  bulkQuestionSchema,
  submitSchema,
  heartbeatSchema
};