-- MXB-77: align triage_status enum with glossary (maybe → someday, backlog → kept)

alter type public.triage_status rename value 'maybe' to 'someday';
alter type public.triage_status rename value 'backlog' to 'kept';
