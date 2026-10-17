from django.urls import path, re_path
from . import views
from django.conf import settings
from django.views.static import serve

urlpatterns = [
    path('', views.home, name='home'),
    path('about', views.about, name='about'),
    path('activity.json', views.activity, name='activity'),
    path('contact', views.contact, name='contact'),
    path('projects', views.projects, name='projects'),
    path('certificates', views.certificates, name='certificates'),
    path('certificates/<str:category>/', views.certificates, name='certificates'),
    path('certificates/<str:category>/<int:cert_id>/', views.certificates, name='certificates'),

]

# Served unconditionally (not gated by DEBUG): this project has no cloud/object
# storage configured, so uploaded media (certificates, diplomas, profile photo)
# is committed to the repo and must be served by Django in production too.
# django.conf.urls.static.static() no-ops when DEBUG=False, so django.views.static.serve
# is wired up directly here instead.
urlpatterns += [
    re_path(r'^media/(?P<path>.*)$', serve, {'document_root': settings.MEDIA_ROOT}),
]