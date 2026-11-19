from django.db import migrations

# Claude Academy course completion badges (Anthropic), oldest first so the
# viewer pages through them in the order they were earned.
BADGES = [
    (
        'Claude 101', 'ai_llm/Claude_Academy_-_claude-101.png',
        'Claude Academy course completion badge (November 16, 2026).',
        'The basics of working with Claude: prompting, projects, files and getting real work done day to day.',
        'https://academy.claude.com/verify/877530011ee9f99fc68e6b9f07e84731',
    ),
    (
        'Claude Code 101', 'ai_llm/Claude_Academy_-_claude-code-101.png',
        'Claude Academy course completion badge (November 16, 2026).',
        'Getting started with Claude Code: working with an AI coding agent in the terminal on a real codebase.',
        'https://academy.claude.com/verify/fad9ccde156b41e66ee4daf3406fa817',
    ),
    (
        'Introduction to Claude Cowork', 'ai_llm/Claude_Academy_-_introduction-to-claude-cowork.png',
        'Claude Academy course completion badge (November 16, 2026).',
        'Handing Claude multi-step knowledge work with Cowork: files, tasks and connected tools.',
        'https://academy.claude.com/verify/c022d700b8129d0c904d6ad313ccff9b',
    ),
    (
        'Claude Platform 101', 'ai_llm/Claude_Academy_-_claude-platform-101.png',
        'Claude Academy course completion badge (November 18, 2026).',
        'Building on the Claude API: models, messages, tool use and the developer platform.',
        'https://academy.claude.com/verify/e558cd7c578e1dee083e9429c2ecc047',
    ),
    (
        'Introduction to Claude Tag', 'ai_llm/Claude_Academy_-_introduction-to-claude-tag.png',
        'Claude Academy course completion badge (November 18, 2026).',
        'Working with Claude inside Slack: tagging Claude into channels and threads to get work done as a team.',
        'https://academy.claude.com/verify/9adadd7fdcd27bf718e06e680045e658',
    ),
    (
        'Claude Code in Action', 'ai_llm/Claude_Academy_-_claude-code-in-action.png',
        'Claude Academy course completion badge (November 19, 2026).',
        'Using Claude Code on real projects: context, planning, hooks, MCP servers and custom workflows.',
        'https://academy.claude.com/verify/8ccd6e294ea15d7490f6f3bedad80bf1',
    ),
]


def add_badges(apps, schema_editor):
    AI_LLM = apps.get_model('portfolio_website', 'AI_LLM')
    for name, image, description, what_i_learned, link in BADGES:
        AI_LLM.objects.get_or_create(
            name=name,
            defaults={
                'image': image, 'description': description,
                'what_i_learned': what_i_learned, 'link': link,
            },
        )


def remove_badges(apps, schema_editor):
    apps.get_model('portfolio_website', 'AI_LLM').objects.filter(
        name__in=[b[0] for b in BADGES]
    ).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('portfolio_website', '0006_real_certificate_links'),
    ]

    operations = [
        migrations.RunPython(add_badges, remove_badges),
    ]
