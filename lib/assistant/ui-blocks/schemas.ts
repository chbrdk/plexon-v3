import { z } from 'zod';
import { UI_BLOCK_LIMITS } from '@/lib/assistant/ui-blocks/types';

const short = z.string().trim().min(1).max(UI_BLOCK_LIMITS.maxShort);
const medium = z.string().trim().max(UI_BLOCK_LIMITS.maxString);

const safeHttpsUrl = z
  .string()
  .url()
  .max(2048)
  .refine((u) => /^https:\/\//i.test(u), { message: 'Only https URLs allowed' });

const safeLinkHref = z.union([
  safeHttpsUrl,
  z
    .string()
    .max(2048)
    .regex(/^\/[^/]/, { message: 'Relative paths must start with /' }),
]);

export const uiToneSchema = z.enum(['neutral', 'success', 'warning', 'error', 'info']);

export const metricGridPropsSchema = z.object({
  title: medium.optional(),
  items: z
    .array(
      z.object({
        label: short,
        value: z.union([z.string(), z.number()]),
        unit: z.string().max(32).optional(),
        tone: uiToneSchema.optional(),
        hint: medium.optional(),
      })
    )
    .min(1)
    .max(UI_BLOCK_LIMITS.maxMetrics),
});

export const dataTablePropsSchema = z.object({
  title: medium.optional(),
  columns: z.array(short).min(1).max(12),
  rows: z
    .array(z.array(z.union([z.string(), z.number(), z.null()])))
    .max(UI_BLOCK_LIMITS.maxTableRows),
});

export const keyValueListPropsSchema = z.object({
  title: medium.optional(),
  items: z
    .array(
      z.object({
        label: short,
        value: z.union([z.string(), z.number()]),
      })
    )
    .min(1)
    .max(UI_BLOCK_LIMITS.maxKeyValues),
});

export const alertPropsSchema = z.object({
  title: short.optional(),
  message: medium,
  tone: uiToneSchema.default('info'),
});

export const linkListPropsSchema = z.object({
  title: medium.optional(),
  links: z
    .array(
      z.object({
        label: short,
        href: safeLinkHref,
        external: z.boolean().optional(),
      })
    )
    .min(1)
    .max(UI_BLOCK_LIMITS.maxLinks),
});

export const textBlockPropsSchema = z.object({
  markdown: medium,
});

export const personaCardPropsSchema = z.object({
  title: medium.optional(),
  personas: z
    .array(
      z.object({
        id: short,
        name: short,
        segment: short,
        confidence: z.number().min(0).max(1),
        headline: medium,
        imageUrl: safeHttpsUrl.optional().nullable(),
        actionHref: safeHttpsUrl.optional(),
      })
    )
    .min(1)
    .max(UI_BLOCK_LIMITS.maxPersonas),
});

export const stepStatusSchema = z.enum(['pending', 'running', 'done', 'error']);

export const stepListPropsSchema = z.object({
  title: medium.optional(),
  steps: z
    .array(
      z.object({
        id: short,
        label: short,
        status: stepStatusSchema,
        detail: medium.optional(),
        progress: z.number().min(0).max(100).optional(),
      })
    )
    .min(1)
    .max(UI_BLOCK_LIMITS.maxSteps),
});

export const summaryCardPropsSchema = z.object({
  title: short,
  checkionScanCount: z.number().nullable().optional(),
  audionPersonaCount: z.number().nullable().optional(),
  links: z
    .array(
      z.object({
        label: short,
        href: safeLinkHref,
        external: z.boolean().optional(),
      })
    )
    .max(UI_BLOCK_LIMITS.maxLinks)
    .optional(),
});

export const cornerTabSectionPropsSchema = z.object({
  tabLabel: short,
  title: medium.optional(),
  markdown: medium,
  placement: z.enum(['top-left', 'top-right']).optional(),
});

export const targetGroupCardPropsSchema = z.object({
  title: medium.optional(),
  targetGroups: z
    .array(
      z.object({
        id: short,
        name: short,
        segment: short,
        description: medium.optional(),
        personaCount: z.number().min(0),
        knowledgeEntryCount: z.number().min(0),
        actionHref: safeLinkHref.optional(),
      })
    )
    .min(1)
    .max(UI_BLOCK_LIMITS.maxTargetGroups),
});

export const chartPropsSchema = z
  .object({
    title: medium.optional(),
    chartType: z.enum(['bar', 'line']).default('bar'),
    xAxisLabel: short.optional(),
    yAxisLabel: short.optional(),
    labels: z.array(short).min(1).max(UI_BLOCK_LIMITS.maxChartLabels),
    datasets: z
      .array(
        z.object({
          label: short,
          values: z.array(z.number()).min(1).max(UI_BLOCK_LIMITS.maxChartLabels),
        })
      )
      .min(1)
      .max(UI_BLOCK_LIMITS.maxChartSeries),
  })
  .superRefine((data, ctx) => {
    for (const [i, ds] of data.datasets.entries()) {
      if (ds.values.length !== data.labels.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `dataset[${i}] values length must match labels (${data.labels.length})`,
          path: ['datasets', i, 'values'],
        });
      }
    }
  });

export const collapsiblePropsSchema = z.object({
  title: short,
  markdown: medium,
  defaultOpen: z.boolean().optional(),
});

export const findingListPropsSchema = z.object({
  title: medium.optional(),
  items: z
    .array(
      z.object({
        title: short,
        description: medium,
        severity: uiToneSchema.optional(),
      })
    )
    .min(1)
    .max(UI_BLOCK_LIMITS.maxFindings),
});

export const recommendationListPropsSchema = z.object({
  title: medium.optional(),
  items: z
    .array(
      z.object({
        title: short,
        description: medium.optional(),
        priority: z.number().int().min(1).max(5).optional(),
        category: short.optional(),
      })
    )
    .min(1)
    .max(UI_BLOCK_LIMITS.maxRecommendations),
});

export const phaseStripPropsSchema = z.object({
  title: medium.optional(),
  phases: z
    .array(
      z.object({
        id: short,
        label: short,
        summary: medium.optional(),
        active: z.boolean().optional(),
        status: z.enum(['upcoming', 'current', 'done']).optional(),
        moments: z
          .array(
            z.object({
              id: short.optional(),
              kind: z.enum(['action', 'thought', 'feeling', 'pain', 'opportunity', 'other']),
              label: short,
            })
          )
          .max(UI_BLOCK_LIMITS.maxMoments)
          .optional(),
      })
    )
    .min(1)
    .max(UI_BLOCK_LIMITS.maxPhases),
});

export const momentListPropsSchema = z.object({
  title: medium.optional(),
  items: z
    .array(
      z.object({
        id: short.optional(),
        kind: z.enum(['action', 'thought', 'feeling', 'pain', 'opportunity', 'other']),
        label: short,
      })
    )
    .min(1)
    .max(UI_BLOCK_LIMITS.maxMoments),
});

export const quoteListPropsSchema = z.object({
  title: medium.optional(),
  items: z
    .array(
      z.object({
        quote: medium,
        attribution: short.optional(),
        context: medium.optional(),
        tone: uiToneSchema.optional(),
      })
    )
    .min(1)
    .max(UI_BLOCK_LIMITS.maxQuotes),
});

export const eventQuickCheckReportPropsSchema = z.object({
  report: z
    .object({
      templateId: z.literal('event_quick_check'),
      meta: z.object({
        title: z.string(),
        url: z.string(),
        domain: z.string(),
        projectName: z.string(),
      }),
      executive: z.object({
        kpiTiles: z.array(z.record(z.string(), z.unknown())),
      }),
      workflow: z.object({
        steps: z.array(z.record(z.string(), z.unknown())),
      }),
      geo: z.record(z.string(), z.unknown()),
      appendix: z.record(z.string(), z.unknown()),
    })
    .passthrough(),
});

export const eventQuickCheckReviewGatePropsSchema = z.object({
  workflowRunId: short,
});

export const UI_BLOCK_SCHEMAS = {
  text: textBlockPropsSchema,
  metric_grid: metricGridPropsSchema,
  data_table: dataTablePropsSchema,
  key_value_list: keyValueListPropsSchema,
  alert: alertPropsSchema,
  link_list: linkListPropsSchema,
  persona_card: personaCardPropsSchema,
  step_list: stepListPropsSchema,
  summary_card: summaryCardPropsSchema,
  corner_tab_section: cornerTabSectionPropsSchema,
  target_group_card: targetGroupCardPropsSchema,
  chart: chartPropsSchema,
  collapsible: collapsiblePropsSchema,
  finding_list: findingListPropsSchema,
  recommendation_list: recommendationListPropsSchema,
  phase_strip: phaseStripPropsSchema,
  moment_list: momentListPropsSchema,
  quote_list: quoteListPropsSchema,
  event_quick_check_report: eventQuickCheckReportPropsSchema,
  event_quick_check_review_gate: eventQuickCheckReviewGatePropsSchema,
} as const;
