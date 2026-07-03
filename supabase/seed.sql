-- Optional: default templates available to every user (is_default = true).
-- Run after schema.sql. TipTap JSON content is a minimal starter doc per
-- category — expand as needed from the editor.

insert into templates (name, category, is_default, content) values
(
  'Consulting proposal',
  'consulting',
  true,
  '{"type":"doc","content":[
    {"type":"heading","attrs":{"level":1},"content":[{"type":"text","text":"Consulting Engagement Proposal"}]},
    {"type":"paragraph","content":[{"type":"text","text":"Prepared for [Client Name] by [Your Name]."}]},
    {"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Scope of work"}]},
    {"type":"paragraph","content":[{"type":"text","text":"Describe the engagement, deliverables, and timeline here."}]},
    {"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Investment"}]},
    {"type":"paragraph","content":[{"type":"text","text":"Outline pricing and payment terms here."}]}
  ]}'::jsonb
),
(
  'Design project proposal',
  'design',
  true,
  '{"type":"doc","content":[
    {"type":"heading","attrs":{"level":1},"content":[{"type":"text","text":"Design Project Proposal"}]},
    {"type":"paragraph","content":[{"type":"text","text":"Prepared for [Client Name] by [Your Name]."}]},
    {"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Project overview"}]},
    {"type":"paragraph","content":[{"type":"text","text":"Describe the design deliverables here."}]},
    {"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Timeline & pricing"}]},
    {"type":"paragraph","content":[{"type":"text","text":"Outline milestones and pricing here."}]}
  ]}'::jsonb
),
(
  'Web / dev project proposal',
  'dev',
  true,
  '{"type":"doc","content":[
    {"type":"heading","attrs":{"level":1},"content":[{"type":"text","text":"Development Project Proposal"}]},
    {"type":"paragraph","content":[{"type":"text","text":"Prepared for [Client Name] by [Your Name]."}]},
    {"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Technical scope"}]},
    {"type":"paragraph","content":[{"type":"text","text":"Describe the build, stack, and deliverables here."}]},
    {"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Timeline & pricing"}]},
    {"type":"paragraph","content":[{"type":"text","text":"Outline milestones and pricing here."}]}
  ]}'::jsonb
),
(
  'Marketing engagement proposal',
  'marketing',
  true,
  '{"type":"doc","content":[
    {"type":"heading","attrs":{"level":1},"content":[{"type":"text","text":"Marketing Engagement Proposal"}]},
    {"type":"paragraph","content":[{"type":"text","text":"Prepared for [Client Name] by [Your Name]."}]},
    {"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Strategy & channels"}]},
    {"type":"paragraph","content":[{"type":"text","text":"Describe the marketing strategy and channels here."}]},
    {"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Retainer & pricing"}]},
    {"type":"paragraph","content":[{"type":"text","text":"Outline retainer terms and pricing here."}]}
  ]}'::jsonb
);
