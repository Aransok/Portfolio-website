from django.contrib import admin
from .models import Certificate, Diploma, AI_LLM

class CertificateAdmin(admin.ModelAdmin):
    list_display = ('name', 'description', 'link_to_certificate') 
    search_fields = ['name']
    list_filter = ('name',)

class DiplomaAdmin(admin.ModelAdmin):
    list_display = ('name', 'description', 'link_to_diploma')
    search_fields = ['name']
    list_filter = ('name',)

class AI_LLMAdmin(admin.ModelAdmin):
    list_display = ('name', 'description', 'link_to_ai_llm')
    search_fields = ['name']
    list_filter = ('name',)

# Check if the model is already registered
if not admin.site.is_registered(Certificate):
    admin.site.register(Certificate, CertificateAdmin)
    
if not admin.site.is_registered(Diploma):
    admin.site.register(Diploma, DiplomaAdmin)

if not admin.site.is_registered(AI_LLM):
    admin.site.register(AI_LLM, AI_LLMAdmin)
