import json
from rest_framework import status
from rest_framework.test import APIClient, APITestCase
from django.test import TestCase, Client, modify_settings
from django.urls import reverse, reverse_lazy
from django.utils import timezone
from cvdp.models import Case, CaseParticipant, Contact, CaseArtifact, Action
from django.contrib.auth.models import Group
from authapp.models import APIToken, User
from django.core import mail
from cvdp.cases.serializers import *
from cvdp.components.models import *
from cvdp.components.serializers import *
from cvdp.lib import add_artifact
from django.core.files.uploadedfile import SimpleUploadedFile
import logging
from urllib3 import encode_multipart_formdata

# initialize the APIClient app
client = Client()

class PostTests(APITestCase):

    def setUp(self):
        self.api_client = APIClient()
        self.coord_user = User.objects.create(email='coordinator', password='Pas$w0rd', is_coordinator=True)
        self.reporter_user = User.objects.create(email='reporter', password='Pas$w0rd')
        self.vendor_user = User.objects.create(email='vendor', password='Pas$w0rd')
        self.vendor_user.userprofile.settings['email_new_posts'] = ['1']
        EmailTemplate.objects.create(template_name='case_new_post', template_type=EmailTemplate.POST_EMAIL,
                                     subject='New Post!', plain_text='You have a new post!', html='Yo, new post!', locale='en')
        self.vendor_user.userprofile.save()
        group = Group.objects.create(name='vendor')
        GroupProfile.objects.create(group=group)
        group.user_set.add(self.vendor_user)

        self.case = Case.objects.create(case_id = '111111', status=Case.ACTIVE_STATUS, title='Test Case', summary="This is a summary of test case")

        cp = CaseParticipant.objects.create(case=self.case, group=group)
        thread = CaseThread.objects.filter(case=self.case, archived=False).first()
        CaseThreadParticipant.objects.create(thread=thread, participant=cp)

    def test_get_threads(self):
        self.api_client.force_authenticate(user=self.coord_user)

        response = self.api_client.get(
            reverse('cvdp:threadlistapi', args=['111111']))

        cases = CaseThread.objects.filter(case=self.case, archived=False)
        serializer = CaseThreadSerializer(cases, many=True)
        self.assertEqual(response.data, serializer.data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_get_archived_threads(self):
        self.api_client.force_authenticate(user=self.coord_user)

        newct = CaseThread.objects.create(case=self.case,
                                          archived=True,
                                          subject="Archived Thread")

        response = self.api_client.get(
            reverse('cvdp:archived', args=['111111']))

        cases = CaseThread.objects.filter(case=self.case, archived=True)
        serializer = CaseThreadSerializer(cases, many=True)
        self.assertEqual(response.data, serializer.data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_vendor_get_archived_threads(self):
        self.api_client.force_authenticate(user=self.vendor_user)

        newct = CaseThread.objects.create(case=self.case,
                                          archived=True,
                                          subject="Archived Thread")


        response = self.api_client.get(
            reverse('cvdp:archived', args=['111111']))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


    def test_notified_vendor_get_archived_threads(self):
        self.api_client.force_authenticate(user=self.vendor_user)
        group = Group.objects.get(name='vendor')
        cp = CaseParticipant.objects.filter(case=self.case, group=group).first()
        cp.notified = timezone.now()
        cp.save()
        newct = CaseThread.objects.create(case=self.case,
                                          archived=True,
                                          subject="Archived Thread")


        response = self.api_client.get(
            reverse('cvdp:archived', args=['111111']))
        self.assertEqual(response.data, [])
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_vendor_get_archived_threads_data(self):
        self.api_client.force_authenticate(user=self.vendor_user)
        group = Group.objects.get(name='vendor')
        newct = CaseThread.objects.create(case=self.case,
                                          archived=True,
                                          subject="Archived Thread")

        cp = CaseParticipant.objects.get(case=self.case, group=group)
        cp.notified=timezone.now()
        cp.save()
        CaseThreadParticipant.objects.create(thread=newct, participant=cp)
        response = self.api_client.get(
            reverse('cvdp:archived', args=['111111']))
        cases = CaseThread.objects.filter(case=self.case, archived=True)
        serializer = CaseThreadSerializer(cases, many=True)
        self.assertEqual(response.data, serializer.data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_vendor_post_archived_threads(self):

        self.api_client.force_authenticate(user=self.vendor_user)
        group = Group.objects.get(name='vendor')

        newct = CaseThread.objects.create(case=self.case,
                                          archived=True,
                                          subject="Archived Thread")
        cp = CaseParticipant.objects.get(case=self.case, group=group)
        CaseThreadParticipant.objects.create(thread=newct, participant=cp)

        valid_payload = {
            'content' : '<b>HERE IS SOME VENDOR CONTENT</b>'
        }

        response = self.api_client.post(
            reverse('cvdp:postlistapi', args=[newct.id]),
            data = json.dumps(valid_payload),
            content_type='application/json')

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


    def test_notified_vendor_post_archived_threads(self):

        self.api_client.force_authenticate(user=self.vendor_user)
        group = Group.objects.get(name='vendor')

        newct = CaseThread.objects.create(case=self.case,
                                          archived=True,
                                          subject="Archived Thread")
        cp = CaseParticipant.objects.get(case=self.case, group=group)
        cp.notified= timezone.now()
        cp.save()
        CaseThreadParticipant.objects.create(thread=newct, participant=cp)

        valid_payload = {
            'content' : '<b>HERE IS SOME VENDOR CONTENT</b>'
        }

        response = self.api_client.post(
            reverse('cvdp:postlistapi', args=[newct.id]),
            data = json.dumps(valid_payload),
            content_type='application/json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_thread_creation(self):
        self.api_client.force_authenticate(user=self.coord_user)

        response = self.api_client.post(
            reverse('cvdp:threadlistapi', args=['111111']),
            data=json.dumps({'subject': 'thread title'}),
            content_type='application/json')

        #forbidden since coordinator is not owner
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_successful_thread_creation(self):
        self.api_client.force_authenticate(user=self.coord_user)

        contact = Contact.objects.get(user=self.coord_user)
        CaseParticipant.objects.create(case=self.case, contact=contact, role="owner")
        valid_payload = {
            'subject' : 'title'
        }
        response = self.api_client.post(
            reverse('cvdp:threadlistapi', args=['111111']),
            data = json.dumps(valid_payload),
            content_type='application/json')

        logger.debug(response)
        #self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)

    def test_successful_post_creation(self):
        self.api_client.force_authenticate(user=self.coord_user)
        contact = Contact.objects.get(user=self.coord_user)
        CaseParticipant.objects.create(case=self.case, contact=contact, role="owner")
        thread = CaseThread.objects.filter(case=self.case, archived=False).first()
        valid_payload = {
            'content' : '<b>HERE IS SOME CONTENT</b>'
        }
        response = self.api_client.post(
            reverse('cvdp:postlistapi', args=[thread.id]),
            data = json.dumps(valid_payload),
            content_type='application/json')

        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)


    def test_get_posts(self):
        self.api_client.force_authenticate(user=self.coord_user)
        contact = Contact.objects.get(user=self.coord_user)
        CaseParticipant.objects.create(case=self.case, contact=contact, role="owner")
        thread = CaseThread.objects.filter(case=self.case, archived=False).first()
        post = Post.objects.create(thread=thread,
                                   author=contact)
        post.add_revision(PostRevision(content="<b>Some content</b>"), save=True)

        response = self.api_client.get(
            reverse('cvdp:postlistapi', args=[thread.id]))

        posts = Post.objects.filter(thread=thread)
        serializer = PostSerializer(posts, many=True)
        self.assertEqual(response.data['results'], serializer.data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        #test edit post
        response = self.api_client.patch(
            reverse('cvdp:postapi', args=[post.id]),
            data=json.dumps({'content': '<p>Updated CONTENT</p>'}),
            content_type='application/json')

        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)

        #test reporter edit
        self.api_client.force_authenticate(user=self.reporter_user)
        #test edit post
        response = self.api_client.patch(
            reverse('cvdp:postapi', args=[post.id]),
            data=json.dumps({'content': '<p>Updated CONTENT</p>'}),
            content_type='application/json')

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        #test edit post on archived thread
        thread.archived=True
        thread.save()

        self.api_client.force_authenticate(user=self.coord_user)

        response = self.api_client.patch(
            reverse('cvdp:postapi', args=[post.id]),
            data=json.dumps({'content': '<p>Updated CONTENT</p>'}),
            content_type='application/json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_vendor_get_posts(self):
        #vendor get posts
        self.api_client.force_authenticate(user=self.vendor_user)
        thread = CaseThread.objects.filter(case=self.case, archived=False).first()
        response = self.api_client.get(
            reverse('cvdp:postlistapi', args=[thread.id]))

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_notified_vendor_get_posts(self):
        #vendor get posts
        self.api_client.force_authenticate(user=self.vendor_user)

        group = Group.objects.get(name='vendor')
        cp = CaseParticipant.objects.filter(case=self.case, group=group).first()
        cp.notified = timezone.now()
        cp.save()
        
        thread = CaseThread.objects.filter(case=self.case, archived=False).first()
        response = self.api_client.get(
            reverse('cvdp:postlistapi', args=[thread.id]))

        posts = Post.objects.filter(thread=thread)
        serializer = PostSerializer(posts, many=True)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.assertEqual(response.data['results'], serializer.data)

    def test_vendor_post_post(self):
        self.api_client.force_authenticate(user=self.vendor_user)
        thread = CaseThread.objects.filter(case=self.case, archived=False).first()
        valid_payload = {
            'content' : '<b>HERE IS SOME VENDOR CONTENT</b>'
        }
        response = self.api_client.post(
            reverse('cvdp:postlistapi', args=[thread.id]),
            data = json.dumps(valid_payload),
            content_type='application/json')

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


    def test_notified_vendor_post_post(self):
        self.api_client.force_authenticate(user=self.vendor_user)
        group = Group.objects.get(name='vendor')
        cp = CaseParticipant.objects.filter(case=self.case, group=group).first()
        cp.notified = timezone.now()
        cp.save()
        thread = CaseThread.objects.filter(case=self.case, archived=False).first()
        valid_payload = {
            'content' : '<b>HERE IS SOME VENDOR CONTENT</b>'
        }
        response = self.api_client.post(
            reverse('cvdp:postlistapi', args=[thread.id]),
            data = json.dumps(valid_payload),
            content_type='application/json')

        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)

    def test_send_post_email(self):
        self.api_client.force_authenticate(user=self.coord_user)
        contact = Contact.objects.get(user=self.coord_user)
        CaseParticipant.objects.create(case=self.case, contact=contact, role="owner")
        thread = CaseThread.objects.filter(case=self.case, archived=False).first()
        valid_payload = {
            'content' : '<b>HERE IS SOME CONTENT</b>'
        }
        response = self.api_client.post(
            reverse('cvdp:postlistapi', args=[thread.id]),
            data = json.dumps(valid_payload),
            content_type='application/json')

        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)
        #assert we are NOT sending mail to vendor user because this user hasn't been notified, sike!
        self.assertEqual(len(mail.outbox), 0)

    def test_send_post_email_forreal(self):
        self.api_client.force_authenticate(user=self.coord_user)
        contact = Contact.objects.get(user=self.coord_user)
        CaseParticipant.objects.create(case=self.case, contact=contact, role="owner")
        cp = CaseParticipant.objects.filter(case=self.case, role="supplier").first()
        cp.notified = timezone.now()
        cp.save()

        thread = CaseThread.objects.filter(case=self.case, archived=False).first()
        valid_payload = {
            'content' : '<b>HERE IS SOME NOTIFIED CONTENT</b>'
        }
        response = self.api_client.post(
            reverse('cvdp:postlistapi', args=[thread.id]),
            data = json.dumps(valid_payload),
            content_type='application/json')

        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)
        self.assertEqual(len(mail.outbox), 1)

    def test_reporter_get_posts(self):
        self.api_client.force_authenticate(user=self.reporter_user)
        thread = CaseThread.objects.filter(case=self.case, archived=False).first()
        response = self.api_client.get(
            reverse('cvdp:postlistapi', args=[thread.id]))

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class CaseParticipantTest(APITestCase):
    def setUp(self):
        self.api_client = APIClient()
        self.coord_user = User.objects.create(email='coordinator', password='Pas$w0rd', is_coordinator=True)
        self.reporter_user = User.objects.create(email='reporter', password='Pas$w0rd')
        self.vendor_user = User.objects.create(email='vendor', password='Pas$w0rd')
        self.group = Group.objects.create(name='vendor')
        GroupProfile.objects.create(group=self.group)
        self.group.user_set.add(self.vendor_user)

        self.case = Case.objects.create(case_id = '111111', title='Test Case', summary="This is a summary of test case", status=Case.ACTIVE_STATUS)


    def test_coordinator_get_participants(self):
        self.api_client.force_authenticate(user=self.coord_user)
        contact = Contact.objects.get(user=self.coord_user)
        CaseParticipant.objects.create(case=self.case, contact=contact, role="owner", user=self.coord_user)
        cp = CaseParticipant.objects.create(case=self.case, group=self.group, role="supplier", user=self.coord_user)

        response = self.api_client.get(
            reverse('cvdp:case_participant_api_list', args=['111111']))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        cps = CaseParticipant.objects.filter(case=self.case)
        serializer = CaseParticipantSerializer(cps, many=True)
        self.assertEqual(serializer.data, response.data)

    def test_reporter_get_participants(self):
        self.api_client.force_authenticate(user=self.reporter_user)
        contact = Contact.objects.get(user=self.coord_user)
        CaseParticipant.objects.create(case=self.case, contact=contact, role="owner", user=self.coord_user)
        cp = CaseParticipant.objects.create(case=self.case, group=self.group,role="supplier", user=self.coord_user)

        response = self.api_client.get(
            reverse('cvdp:case_participant_api_list', args=['111111']))

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_vendor_get_participants(self):
        self.api_client.force_authenticate(user=self.vendor_user)
        contact = Contact.objects.get(user=self.coord_user)
        CaseParticipant.objects.create(case=self.case, contact=contact, role="owner", user=self.coord_user)
        cp = CaseParticipant.objects.create(case=self.case, group=self.group,role="supplier", user=self.coord_user)
        response = self.api_client.get(
            reverse('cvdp:case_participant_api_list', args=['111111']))

        #vendor not notified
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        cp.notified = timezone.now()
        cp.save()

        response = self.api_client.get(
            reverse('cvdp:case_participant_api_list', args=['111111']))

        #vendor now notified
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        cps = CaseParticipant.objects.filter(case=self.case).exclude(notified__isnull=True)
        serializer = CaseParticipantSerializer(cps, many=True)
        self.assertEqual(serializer.data, response.data)

    def test_coordinator_add_vendor(self):

        self.api_client.force_authenticate(user=self.coord_user)
        contact = Contact.objects.get(user=self.coord_user)
        CaseParticipant.objects.create(case=self.case, contact=contact, role="owner")
        response = self.api_client.post(
            reverse('cvdp:case_participant_api_list', args=['111111']),
            data=json.dumps({'names':[str(self.group.groupprofile.uuid)], 'role': 'supplier'}),
            content_type='application/json'
        )

        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)

    def test_coordinator_change_vendor_role(self):
        self.api_client.force_authenticate(user=self.coord_user)
        contact = Contact.objects.get(user=self.coord_user)
        CaseParticipant.objects.create(case=self.case, contact=contact, role="owner")
        cp = CaseParticipant.objects.create(case=self.case, group=self.group, role="supplier", user=self.coord_user)

        response = self.api_client.patch(
            reverse('cvdp:case_participant_api', args=[cp.id]),
            data=json.dumps({'role': 'reporter'}),
            content_type='application/json'
        )

        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)

    def test_coordinator_change_vendor_to_owner_role(self):
        self.api_client.force_authenticate(user=self.coord_user)
        contact = Contact.objects.get(user=self.coord_user)
        CaseParticipant.objects.create(case=self.case, contact=contact, role="owner")
        cp = CaseParticipant.objects.create(case=self.case, group=self.group, role="supplier", user=self.coord_user)

        response = self.api_client.patch(
            reverse('cvdp:case_participant_api', args=[cp.id]),
            data=json.dumps({'role': 'owner'}),
            content_type='application/json'
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


    def test_vendor_change_vendor_role(self):
        #should be forbidden
        self.api_client.force_authenticate(user=self.vendor_user)
        contact = Contact.objects.get(user=self.coord_user)
        CaseParticipant.objects.create(case=self.case, contact=contact, role="owner")
        cp = CaseParticipant.objects.create(case=self.case, group=self.group,role="supplier", user=self.coord_user)

        response = self.api_client.patch(
            reverse('cvdp:case_participant_api', args=[cp.id]),
            data=json.dumps({'role': 'owner'}),
            content_type='application/json'
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_notowner_add_vendor(self):
        self.api_client.force_authenticate(user=self.coord_user)
        response = self.api_client.post(
            reverse('cvdp:case_participant_api_list', args=['111111']),
            data=json.dumps({'names':[str(self.group.groupprofile.uuid)], 'role': 'supplier'}),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_vendor_add_vendor(self):
        self.api_client.force_authenticate(user=self.vendor_user)
        response = self.api_client.post(
            reverse('cvdp:case_participant_api_list', args=['111111']),
            data=json.dumps({'names':[str(self.group.groupprofile.uuid)], 'role': 'supplier'}),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
