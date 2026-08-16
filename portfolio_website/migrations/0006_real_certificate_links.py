from django.db import migrations

# Real verification links/grades from the CV, for the entries that have them.
CERTIFICATE_UPDATES = {
    'Python Web Framework': ('https://softuni.bg/Certificates/Details/182339/aa7184ea', 'Grade: 6.00/6.00'),
    'JS Front-End': ('https://softuni.bg/Certificates/Details/201316/5ce8ca80', 'Grade: 6.00/6.00'),
    'Containers and Cloud': ('https://softuni.bg/Certificates/Details/206966/4c2c8e8b', 'Grade: 6.00/6.00'),
    'Software Engineering and DevOps': ('https://softuni.bg/Certificates/Details/213331/2d55e235', 'Grade: 6.00/6.00'),
    'Angular': ('https://softuni.bg/Certificates/Details/212770/7ec3caaf', 'Grade: 5.94/6.00'),
}

DIPLOMA_UPDATES = {
    'Python Full-Stack Developer': 'https://softuni.bg/Certificates/Details/215978/eb3cab1b',
    'Software Engineer with Python': 'https://softuni.bg/Certificates/Details/208770/e20ed08e',
}


def apply_real_links(apps, schema_editor):
    Certificate = apps.get_model('portfolio_website', 'Certificate')
    Diploma = apps.get_model('portfolio_website', 'Diploma')

    for name, (link, grade) in CERTIFICATE_UPDATES.items():
        Certificate.objects.filter(name=name).update(
            link=link,
        )
        for cert in Certificate.objects.filter(name=name):
            cert.what_i_learned = f"{cert.what_i_learned} {grade}".strip()
            cert.save()

    for name, link in DIPLOMA_UPDATES.items():
        Diploma.objects.filter(name=name).update(link=link)


def revert_real_links(apps, schema_editor):
    Certificate = apps.get_model('portfolio_website', 'Certificate')
    Diploma = apps.get_model('portfolio_website', 'Diploma')
    Certificate.objects.filter(name__in=CERTIFICATE_UPDATES.keys()).update(link='https://softuni.bg/')
    Diploma.objects.filter(name__in=DIPLOMA_UPDATES.keys()).update(link='https://softuni.bg/')


class Migration(migrations.Migration):

    dependencies = [
        ('portfolio_website', '0005_seed_certificates'),
    ]

    operations = [
        migrations.RunPython(apply_real_links, revert_real_links),
    ]
