# Generated by Django 5.0.1 on 2025-02-06 11:10

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('portfolio_website', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='ai_llm',
            name='image',
            field=models.BinaryField(),
        ),
        migrations.AlterField(
            model_name='certificate',
            name='image',
            field=models.BinaryField(),
        ),
        migrations.AlterField(
            model_name='diploma',
            name='image',
            field=models.BinaryField(),
        ),
    ]
