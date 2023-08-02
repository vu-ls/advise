import json
from rest_framework import status
from rest_framework.test import APIClient, APITestCase
from authapp.models import User
from django.contrib.auth.models import Group
from cvdp.models import Case, CaseParticipant, Contact
from django.test import TestCase, Client, modify_settings
from django.urls import reverse, reverse_lazy
from django.utils import timezone
import logging

logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)

# initialize the APIClient app
client = Client()

class TestAccessUrls(TestCase):

    def setUp(self):

        self.coord_user = User.objects.create(email='coordinator', password='Pas$w0rd', is_coordinator=True)
        self.reporter_user = User.objects.create(email='reporter', password='Pas$w0rd')
        self.vendor_user = User.objects.create(email='vendor', password='Pas$w0rd')
        group = Group.objects.create(name='vendor')
        group.user_set.add(self.vendor_user)

        Case.objects.create(case_id = '123456', status=Case.ACTIVE_STATUS, title='Test Case', summary="This is a summary of test case")
        Case.objects.create(case_id = '987654', status=Case.ACTIVE_STATUS, title='Test Case', summary="This is a summary of test case")
        acase = Case.objects.create(case_id = '567891', status=Case.ACTIVE_STATUS, title='Test Case', summary="This is a summary of test case")
        case = Case.objects.create(case_id = '111111', status=Case.ACTIVE_STATUS, title='Test Case', summary="This is a summary of test case")
        pendingcase = Case.objects.create(case_id='444444', title='Pending Test', summary='This case is still pending')

        contact = Contact.objects.get(user=self.coord_user)

        CaseParticipant.objects.create(case=case, contact=contact, role="owner")
        CaseParticipant.objects.create(case=case, group=group, notified=timezone.now())

        CaseParticipant.objects.create(case=acase, contact=contact, role="owner")
        CaseParticipant.objects.create(case=acase, group=group, notified=timezone.now())


    @modify_settings(MIDDLEWARE={
        'remove': 'authapp.middleware.Require2FAMiddleware'
    })
    def test_coordinator_case_access(self):
        # get API response
        client = Client()
        client.force_login(user=self.coord_user)
        response = client.get(reverse('cvdp:casesearch'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        response = client.get(reverse('cvdp:case', args=['111111']))
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        response = client.get(reverse('cvdp:caseparticipants', args=['111111']))
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        response = client.get(reverse('cvdp:edit_case', args=['111111']))
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        response = client.get(reverse('cvdp:casestatus', args=['111111']))
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        response = client.get(reverse('cvdp:advisory', args=['111111']))
        self.assertEqual(response.status_code, status.HTTP_200_OK)


    @modify_settings(MIDDLEWARE={
        'remove': 'authapp.middleware.Require2FAMiddleware'
    })
    def test_vendor_case_access(self):
        client = Client()
        client.force_login(user=self.vendor_user)
        response = client.get(reverse('cvdp:casesearch'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        response = client.get(reverse('cvdp:case', args=['111111']))
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        response = client.get(reverse('cvdp:caseparticipants', args=['111111']))
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        response = client.get(reverse('cvdp:edit_case', args=['111111']))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        response = client.get(reverse('cvdp:casestatus', args=['111111']))
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        response = client.get(reverse('cvdp:advisory', args=['111111']))
        self.assertEqual(response.status_code, status.HTTP_200_OK)


    """
    @modify_settings(MIDDLEWARE={
        'remove': 'authapp.middleware.Require2FAMiddleware'
    })
    def test_reporter_case_access(self):
        client = Client()
        client.force_login(user=self.reporter_user)
        response = client.get(reverse('cvdp:casesearch'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        response = client.get(reverse('cvdp:case', args=['111111']))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        response = client.get(reverse('cvdp:caseparticipants', args=['111111']))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        response = client.get(reverse('cvdp:edit_case', args=['111111']))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        response = client.get(reverse('cvdp:casestatus', args=['111111']))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        response = client.get(reverse('cvdp:advisory', args=['111111']))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    """
