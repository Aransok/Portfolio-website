# Generated by Django 5.0.1 on 2025-02-03 09:17

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('portfolio_website', '0003_alter_ai_llm_image_alter_certificate_image_and_more'),
    ]

    operations = [
        migrations.AlterField(
            model_name='ai_llm',
            name='image',
            field=models.ImageField(upload_to=''),
        ),
        migrations.AlterField(
            model_name='certificate',
            name='image',
            field=models.ImageField(upload_to=''),
        ),
        migrations.AlterField(
            model_name='diploma',
            name='image',
            field=models.ImageField(upload_to=''),
        ),
    ]
