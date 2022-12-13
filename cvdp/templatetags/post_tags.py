from django import template
from django.conf import settings
import random
import os
import traceback

register = template.Library()

@register.filter
def last_status(status):
    return "BOOSH"



@register.filter
def userlogo(user, imgclass):
    try:
        if user:
            if user.userprofile.photo:
                return f"<img class=\"{imgclass} rounded-circle flex-shrink-0\" src=\"{user.userprofile.photo.url}\" title=\"{user.screen_name}, {user.org}\">"
            else:
                
                return f"<div class=\"{imgclass} rounded-circle flex-shrink-0 text-center\" style=\"background-color:{user.userprofile.logocolor};\" title=\"{user.screen_name}, {user.org}\"><span class=\"logo-initial\">{user.initial}</span></div>"
            return f"<div class=\"{imgclass} rounded-circle flex-shrink-0 text-center\" style=\"background-color:#b00;\" title=\"{user.screen_name}, {user.org}\"></div>"
    except:
        print(traceback.format_exc())
        pass


@register.filter
def postlogo(post, imgclass):
    try:
        from cvdp.models import Post
    except ImportError:
        if settings.DEBUG:
            raise template.TemplateSyntaxError("Error in template tags: Can't load Post model.")

    if post.group:
        if post.group.groupcontact.get_logo():
            return f"<img class=\"{imgclass} rounded-circle flex-shrink-0\" src=\"{post.group.groupprofile.get_logo()}\">"
        else:
            return f"<div class=\"{imgclass} rounded-circle text-center flex-shrink-0\" style=\"background-color:{post.group.groupprofile.logocolor};\"><span class=\"logo-initial\">{post.group.name}</span></div>"
    elif post.author:
        if post.author.user:
            if post.author.user.userprofile.photo:
                return f"<img class=\"{imgclass} rounded-circle flex-shrink-0\" src=\"{post.author.user.userprofile.photo}\">"
            else:
                return f"<div class=\"{imgclass} rounded-circle text-center flex-shrink-0\" style=\"background-color:{post.author.user.userprofile.logocolor};\"><span class=\"logo-initial\">{post.author.user.initial}</span></div>"
        else:
            return f"<div class=\"{imgclass} rounded-circle text-center flex-shrink-0\" style=\"background-color:black;\"><span class=\"logo-initial\">{post.author.contact.name[0]}</span></div>"




@register.filter
def grouplogo(group, imgclass):
    if group.groupprofile.get_logo():
        return f"<img class=\"{imgclass} rounded-circle flex-shrink-0\" src=\"{group.groupprofile.get_logo()}\">"
    else:
        return f"<div class=\"{imgclass} rounded-circle flex-shrink-0 text-center\" style=\"background-color:{group.groupprofile.icon_color};\"><span class=\"logo-initial\">{group.name[0]}</span></div>"

@register.filter
def showfileicon(filename):
    name, extension = os.path.splitext(filename)
    if extension in [".doc", ".docx"]:
        return "<i class=\"far fa-file-word\"></i>"
    elif extension in [".xls", ".xlst"]:
        return "<i class=\"far fa-file-excel\"></i>"
    elif extension in [".ppt", ".pptx"]:
        return "<i class=\"far fa-file-powerpoint\"></i>"
    elif extension in [".pdf"]:
        return "<i class=\"far fa-file-pdf\"></i>"
    elif extension in [".zip", ".tar", ".tarz", ".bzip", ".7z"]:
        return "<i class=\"far fa-file-archive\"></i>"
    elif extension in [".png", ".jpeg", ".jpg", ".bmp", ".tiff", ".gif", ".svg"]:
        return "<i class=\"far fa-file-image\"></i>"
    else:
        return "<i class=\"far fa-file\"></i>"


@register.simple_tag()
def show_status_class(status=3):
    if status == 1:
        return "label alert"
    elif status == 2:
        return "label success"
    else:
        return "label warning"

@register.simple_tag()
def show_status(status=3):
    if status == 1:
        return "<span class=\"badge rounded-pill bg-danger\">Affected</span>"
    elif status == 2:
        return "<span class=\"badge rounded-pill bg-success\">Not Affected</span>"
    else:
        return "<span class=\"badge rounded-pill bg-secondary\">Unknown</span>"
