# Generated by Django 5.0.1 on 2025-02-06 09:29

from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='AI_LLM',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=255)),
                ('description', models.TextField()),
                ('what_i_learned', models.TextField()),
                ('image', models.ImageField(upload_to='ai_llm/')),
                ('link_to_ai_llm', models.URLField()),
            ],
        ),
        migrations.CreateModel(
            name='Certificate',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=255)),
                ('description', models.TextField()),
                ('what_i_learned', models.TextField()),
                ('image', models.ImageField(upload_to='certificates/')),
                ('link_to_certificate', models.URLField()),
            ],
        ),
        migrations.CreateModel(
            name='Diploma',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=255)),
                ('description', models.TextField()),
                ('what_i_learned', models.TextField()),
                ('image', models.ImageField(upload_to='diplomas/')),
                ('link_to_diploma', models.URLField()),
            ],
        ),
    ]
