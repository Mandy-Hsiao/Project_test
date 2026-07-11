from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', include('sop_app.urls')),
]

from django.urls import path
from . import views

urlpatterns = [
    path("", views.home, name="home"),
    path("salary/", views.salary, name="salary"),
    path("chatbot/<str:theme>/", views.chatbot, name="chatbot"),
]