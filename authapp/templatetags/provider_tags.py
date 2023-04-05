from django import template

register = template.Library()


@register.filter
def get_provider(provider_list, provider):
    print(provider_list)
    for x in provider_list:
        if provider == x.name:
            return x
    return None

@register.filter
def filter_providers(provider_list):
    new_list = []
    for x in provider_list:
        if 'advise' in x.name.lower():
            continue
        new_list.append(x)

    return new_list
