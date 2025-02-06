from django.db import models

class Certificate(models.Model):
    name = models.CharField(max_length=255)
    description = models.TextField()
    what_i_learned = models.TextField()
    image = models.ImageField(upload_to='certificates/')
    link_to_certificate = models.URLField()

    def __str__(self):
        return self.name

class Diploma(models.Model):
    name = models.CharField(max_length=255)
    description = models.TextField()
    what_i_learned = models.TextField()
    image = models.ImageField(upload_to='diplomas/')
    link_to_diploma = models.URLField()

    def __str__(self):
        return self.name

class AI_LLM(models.Model):
    name = models.CharField(max_length=255)
    description = models.TextField()
    what_i_learned = models.TextField()
    image = models.ImageField(upload_to='ai_llm/')
    link_to_ai_llm = models.URLField()

    def __str__(self):
        return self.name