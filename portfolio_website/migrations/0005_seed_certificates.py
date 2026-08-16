from django.db import migrations

SOFTUNI = 'https://softuni.bg/'

CERTIFICATES = [
    (
        'Programming Basics', 'certificates/Programming_Basics_-_January_2022_-_Certificate.jpeg',
        'Introductory SoftUni course on programming fundamentals and problem solving (January 2022).',
        'Basic syntax, control flow, and how to break a problem down into code.',
    ),
    (
        'Programming Fundamentals with Python', 'certificates/Programming_Fundamentals_with_Python_-_September_2022_-_Certificate.jpeg',
        'SoftUni course on Python fundamentals (September 2022).',
        'Core Python syntax, data structures, and control flow.',
    ),
    (
        'Python Advanced', 'certificates/Python_Advanced_-_January_2023_-_Certificate.jpeg',
        'SoftUni course on advanced Python topics (January 2023).',
        'Algorithms, data structures, and more advanced language features.',
    ),
    (
        'Python OOP', 'certificates/Python_OOP_-_February_2023_-_Certificate.jpeg',
        'SoftUni course on object-oriented programming in Python (February 2023).',
        'Classes, inheritance, encapsulation, and OOP design patterns.',
    ),
    (
        'Python Web Basics', 'certificates/Python_Web_Basics_-_May_2023_-_Certificate.jpeg',
        'SoftUni course on the fundamentals of web development with Python (May 2023).',
        'HTTP fundamentals, requests, and building basic web applications.',
    ),
    (
        'Python Web Framework', 'certificates/Python_Web_Framework_-_June_2023_-_Certificate.jpeg',
        'SoftUni course on building full web applications with Django (June 2023).',
        'MVC architecture, ORM models, views, templates, and forms in Django.',
    ),
    (
        'HTML & CSS', 'certificates/HTML__CSS_-_September_2023_-_Certificate.jpeg',
        'SoftUni course on front-end fundamentals (September 2023).',
        'Semantic HTML and responsive CSS layouts.',
    ),
    (
        'JS Front-End', 'certificates/JS_Front-End_-_October_2023_-_Certificate.jpeg',
        'SoftUni course on modern JavaScript for front-end development (October 2023).',
        'DOM manipulation, events, and building interactive UIs with JavaScript.',
    ),
    (
        'Containers and Cloud', 'certificates/Containers_and_Cloud_-_January_2024_-_Certificate.jpeg',
        'SoftUni course on containerization and cloud fundamentals (January 2024).',
        'Docker containers and the basics of deploying to the cloud.',
    ),
    (
        'Angular', 'certificates/Angular_-_February_2024_-_Certificate.jpeg',
        'SoftUni course on building single-page applications with Angular (February 2024).',
        'Components, services, routing, and state management in Angular.',
    ),
    (
        'Software Engineering and DevOps', 'certificates/Software_Engineering_and_DevOps_-_February_2024_-_Certificate.jpeg',
        'SoftUni course on software engineering practices and DevOps (February 2024).',
        'CI/CD pipelines, testing practices, and software engineering workflows.',
    ),
]

DIPLOMAS = [
    (
        'Python Full-Stack Developer', 'diplomas/Diploma_for_Python_Full-Stack_Developer.jpeg',
        "Diploma awarded for completing SoftUni's Python Full-Stack Developer program.",
        'End-to-end web development: Python back ends, front-end frameworks, and databases.',
    ),
    (
        'Software Engineer with Python', 'diplomas/Diploma_for_Software_Engineer_with_Python.jpeg',
        "Diploma awarded for completing SoftUni's Software Engineer with Python program.",
        'Software engineering fundamentals with Python across the full curriculum.',
    ),
]

AI_LLMS = [
    (
        'AI Basics — Honorable Mention', 'ai_llm/AI_Basics_-_January_2025_-_Honorable_mention.png',
        "Honorable mention from SoftUni's AI Basics course (January 2025).",
        'Foundational AI/ML concepts and an introduction to working with LLMs.',
    ),
]


def seed_data(apps, schema_editor):
    Certificate = apps.get_model('portfolio_website', 'Certificate')
    Diploma = apps.get_model('portfolio_website', 'Diploma')
    AI_LLM = apps.get_model('portfolio_website', 'AI_LLM')

    for name, image, description, what_i_learned in CERTIFICATES:
        Certificate.objects.create(
            name=name, image=image, description=description,
            what_i_learned=what_i_learned, link=SOFTUNI,
        )

    for name, image, description, what_i_learned in DIPLOMAS:
        Diploma.objects.create(
            name=name, image=image, description=description,
            what_i_learned=what_i_learned, link=SOFTUNI,
        )

    for name, image, description, what_i_learned in AI_LLMS:
        AI_LLM.objects.create(
            name=name, image=image, description=description,
            what_i_learned=what_i_learned, link=SOFTUNI,
        )


def remove_data(apps, schema_editor):
    apps.get_model('portfolio_website', 'Certificate').objects.filter(
        name__in=[c[0] for c in CERTIFICATES]
    ).delete()
    apps.get_model('portfolio_website', 'Diploma').objects.filter(
        name__in=[d[0] for d in DIPLOMAS]
    ).delete()
    apps.get_model('portfolio_website', 'AI_LLM').objects.filter(
        name__in=[a[0] for a in AI_LLMS]
    ).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('portfolio_website', '0004_rename_link_to_ai_llm_ai_llm_link_and_more'),
    ]

    operations = [
        migrations.RunPython(seed_data, remove_data),
    ]
