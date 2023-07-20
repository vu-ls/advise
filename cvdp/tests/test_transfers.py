import json
from rest_framework import status
from rest_framework.test import APIClient, APITestCase
from django.test import TestCase, Client, modify_settings
from django.urls import reverse, reverse_lazy
from cvdp.models import *
from django.contrib.auth.models import Group
from authapp.models import APIToken, User
from cvdp.components.models import Component, ComponentStatus, Product, StatusRevision
from django.core.files.uploadedfile import SimpleUploadedFile
from cvdp.cases.serializers import *
from cvdp.lib import add_artifact
from cvdp.manage.models import AdVISEConnection
import logging



class TransferTests(APITestCase):

    def setUp(self):

        self.api_client = APIClient()
        self.coord_user = User.objects.create(email='coordinator', password='Pas$w0rd', is_coordinator=True, first_name="Vul", last_name="Labs")
        self.reporter_user = User.objects.create(email='reporter', password='Pas$w0rd')
        self.vendor_user = User.objects.create(email='vendor', password='Pas$w0rd')
        group = Group.objects.create(name='vendor')
        GroupProfile.objects.create(group=group)
        group.user_set.add(self.vendor_user)

        self.service_account = User.objects.create(email='vendor+API', screen_name='API account')
        group.user_set.add(self.service_account)
        token = APIToken(user=self.service_account)
        self.api_key=token.generate_key()
        token.save(self.api_key)

        self.case = Case.objects.create(case_id = '111111', title='Test Case', summary="This is a summary of test case", status=Case.ACTIVE_STATUS)
        vul = Vulnerability.objects.create(case=self.case, description="Let's do this!")
        artifact = SimpleUploadedFile("artifact.jpg", b"RANDOM COnTEJKLDSJFSINTt", content_type="image/jpeg")
        component = Component.objects.create(name='Component', version='1.2.3')
        Product.objects.create(supplier=group, component=component)
        self.status = ComponentStatus(component=component, vul=vul)

        sr = StatusRevision(status=1, version_value='1.2.3', statement='This is affected', user=self.coord_user)
        self.status.add_revision(sr, save=True)
        artifact = add_artifact(artifact)
        action = Action(title="Uploaded file", user=self.coord_user)
        action.save()
        self.artifact = CaseArtifact(file=artifact, case=self.case, action=action)
        self.artifact.save()

        self.connection = AdVISEConnection(group=group, url="http://localhost:8000", incoming_key=token)
        self.connection.save()


    def test_accept_transfer(self):

        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.api_key)

        form = [{"question": 'How are you?', "answer": 'Good'},
                {"question": 'How old are you?', "answer": '10'},
                {"question": "Provide hidden response", "answer": "this is private", "priv": True}]
        report = {'report': form,
                  'source': 'anonymous',
                  'transfer_reason': 'because I need to test this.'}

        response = self.client.post(reverse('cvdp:transfer_reportapi'),
                               data=json.dumps(report),
                               content_type='application/json')
        print(response.data)
        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)
        self.assertContains(response, 'case_id', status_code=202)
        self.assertContains(response, 'status', status_code=202)


    def test_transfer_with_vuls(self):

        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.api_key)

        form = [{"question": 'How are you?', "answer": 'Good'},
                {"question": 'How old are you?', "answer": '10'},
                {"question": "Provide hidden response", "answer": "this is private", "priv": True}]
        report = {'report': form,
                  'source': 'anonymous',
                  'transfer_reason': 'because I need to test this.'}

        response = self.client.post(reverse('cvdp:transfer_reportapi'),
                               data=json.dumps(report),
                               content_type='application/json')
        print(response.data)
        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)
        self.assertContains(response, 'case_id', status_code=202)
        self.assertContains(response, 'status', status_code=202)
        case_id = response.data['case_id']

        vuls = [{'description': 'this is a vul',
                'cve': 'CVE-2023-1234'}]

        response = self.client.post(reverse('cvdp:transfer_vulapi', args=[case_id]),
                                    data=json.dumps(vuls),
                                    content_type='application/json')
        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)


    def test_transfer_bad_vuls(self):

        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.api_key)

        form = [{"question": 'How are you?', "answer": 'Good'},
                {"question": 'How old are you?', "answer": '10'},
                {"question": "Provide hidden response", "answer": "this is private", "priv": True}]
        report = {'report': form,
                  'source': 'anonymous',
                  'transfer_reason': 'because I need to test this.'}

        response = self.client.post(reverse('cvdp:transfer_reportapi'),
                               data=json.dumps(report),
                               content_type='application/json')
        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)
        self.assertContains(response, 'case_id', status_code=202)
        self.assertContains(response, 'status', status_code=202)
        case_id = response.data['case_id']

        vuls = [{'cve': 'CVE-2023-1234'}]

        response = self.client.post(reverse('cvdp:transfer_vulapi', args=[case_id]),
                                    data=json.dumps(vuls),
                                    content_type='application/json')
        #must contain description
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertContains(response, 'description', status_code=400)


    def test_transfer_case_artifacts(self):
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.api_key)

        form = [{"question": 'How are you?', "answer": 'Good'},
                {"question": 'How old are you?', "answer": '10'},
                {"question": "Provide hidden response", "answer": "this is private", "priv": True}]
        report = {'report': form,
                  'source': 'anonymous',
                  'transfer_reason': 'because I need to test this.'}

        response = self.client.post(reverse('cvdp:transfer_reportapi'),
                               data=json.dumps(report),
                               content_type='application/json')
        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)
        self.assertContains(response, 'case_id', status_code=202)
        self.assertContains(response, 'status', status_code=202)
        case_id = response.data['case_id']

        f =  SimpleUploadedFile("artifact.jpg", b"RANDOM COnTEJKLDSJFSINTt", content_type="image/jpeg")

        response = self.client.post(reverse('cvdp:transfer_artifactapi', args=[case_id]),
                                    {'file': f},
                                    format='multipart')
        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)

    def test_invalid_token(self):
        t = APIToken(user=self.coord_user)
        key = t.generate_key()
        t.save(key)

        self.client.credentials(HTTP_AUTHORIZATION='Token ' + key)

        form = [{"question": 'How are you?', "answer": 'Good'},
                {"question": 'How old are you?', "answer": '10'},
                {"question": "Provide hidden response", "answer": "this is private", "priv": True}]
        report = {'report': form,
                  'source': 'anonymous',
                  'transfer_reason': 'because I need to test this.'}

        response = self.client.post(reverse('cvdp:transfer_reportapi'),
                               data=json.dumps(report),
                               content_type='application/json')

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_bad_report(self):

        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.api_key)

        form = [{"question": 'How are you?'},
                {"question": 'How old are you?', "answer": '10'},
                {"question": "Provide hidden response", "answer": "this is private"}]
        report = {'report': form,
                  'source': 'anonymous',
                  'transfer_reason': 'because I need to test this.'}

        response = self.client.post(reverse('cvdp:transfer_reportapi'),
                               data=json.dumps(report),
                               content_type='application/json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertContains(response, 'invalid', status_code=400)

    def test_bad_post(self):

        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.api_key)

        form = {"question": 'How old are you?', "answer": '10'}
        report = {'report': form,
                  'source': 'anonymous',
                  'transfer_reason': 'because I need to test this.'}

        response = self.client.post(reverse('cvdp:transfer_reportapi'),
                               data=json.dumps(report),
                               content_type='application/json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertContains(response, 'invalid', status_code=400)

    def test_missing_reason(self):


        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.api_key)

        form = [{"question": 'How are you?', "answer": 'Good'},
                {"question": 'How old are you?', "answer": '10'},
                {"question": "Provide hidden response", "answer": "this is private"}]
        report = {'report': form,
                  'source': 'anonymous'}

        response = self.client.post(reverse('cvdp:transfer_reportapi'),
                               data=json.dumps(report),
                               content_type='application/json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertContains(response, 'transfer_reason', status_code=400)


    def test_transfer_thread(self):
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.api_key)

        form = [{"question": 'How are you?', "answer": 'Good'},
                {"question": 'How old are you?', "answer": '10'},
                {"question": "Provide hidden response", "answer": "this is private"}]
        report = {'report': form,
                  'source': 'anonymous',
                  'transfer_reason': 'because I need to test this.'}

        response = self.client.post(reverse('cvdp:transfer_reportapi'),
                               data=json.dumps(report),
                               content_type='application/json')
        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)
        self.assertContains(response, 'case_id', status_code=202)
        self.assertContains(response, 'status', status_code=202)
        case_id = response.data['case_id']

        posts = {'posts': [{'content': '<p>This is a thing</p>', 'author': 'owner from Vullabs', 'created': '2023-07-10T13:56:58.506394Z', 'replies': []},
                              {'content': '<b>TEST TEST</b>', 'author': 'participant from ABC Corp.', 'created': '2023-07-11T14:12:23.90384Z', 'replies': [
                                  {'content': '<p>This is a reply</p>', 'author': 'owner from Vullabs', 'created': '2023-07-11T15:56:58.506394Z'},
                                  {'content': '<p>This is another reply</p>', 'author': 'reporter', 'created': '2023-07-11T16:56:58.506394Z'}],
                               }
                           ]
                 }


        response = self.client.post(reverse('cvdp:transfer_postapi', args=[case_id]),
                                    data=json.dumps(posts),
                                    content_type='application/json')
        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)

        #this should only allow 1 transfer
        response = self.client.post(reverse('cvdp:transfer_postapi', args=[case_id]),
                                    data=json.dumps(posts),
                                    content_type='application/json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_transfer_thread_fail(self):

        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.api_key)

        form = [{"question": 'How are you?', "answer": 'Good'},
                {"question": 'How old are you?', "answer": '10'},
                {"question": "Provide hidden response", "answer": "this is private"}]
        report = {'report': form,
                  'source': 'anonymous',
                  'transfer_reason': 'because I need to test this.'}

        response = self.client.post(reverse('cvdp:transfer_reportapi'),
                               data=json.dumps(report),
                               content_type='application/json')
        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)
        self.assertContains(response, 'case_id', status_code=202)
        self.assertContains(response, 'status', status_code=202)
        case_id = response.data['case_id']

        posts = {'posts': [{'author': 'owner from Vullabs', 'created': '2023-07-10T13:56:58.506394Z', 'replies': []},
	                      {'content': '<b>TEST TEST</b>', 'author': 'participant from ABC Corp.', 'created': '2023-07-11T14:12:23.90384Z', 'replies': [
                                  {'content': '<p>This is a reply</p>', 'author': 'owner from Vullabs', 'created': '2023-07-11T15:56:58.506394Z'},
                                  {'content': '<p>This is another reply</p>', 'author': 'reporter', 'created': '2023-07-11T16:56:58.506394Z'}],
                               }
                           ]
                 }


        response = self.client.post(reverse('cvdp:transfer_postapi', args=[case_id]),
                                    data=json.dumps(posts),
                                    content_type='application/json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_transfer_thread_reply_fail(self):

        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.api_key)

        form = [{"question": 'How are you?', "answer": 'Good'},
                {"question": 'How old are you?', "answer": '10'},
                {"question": "Provide hidden response", "answer": "this is private"}]
        report = {'report': form,
                  'source': 'anonymous',
                  'transfer_reason': 'because I need to test this.'}

        response = self.client.post(reverse('cvdp:transfer_reportapi'),
                               data=json.dumps(report),
                               content_type='application/json')
        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)
        self.assertContains(response, 'case_id', status_code=202)
        self.assertContains(response, 'status', status_code=202)
        case_id = response.data['case_id']

        posts = {'posts': [{'content': 'some stuff', 'author': 'owner from Vullabs', 'created': '2023-07-10T13:56:58.506394Z', 'replies': []},
                              {'content': '<b>TEST TEST</b>', 'author': 'participant from ABC Corp.', 'created': '2023-07-11T14:12:23.90384Z', 'replies': [
                                  {'content': '<p>This is a reply</p>', 'author': 'owner from Vullabs', 'created': '2023-07-11T15:56:58.506394Z'},
                                  {'author': 'reporter', 'created': '2023-07-11T16:56:58.506394Z'}],
                               }
                           ]
                 }


        response = self.client.post(reverse('cvdp:transfer_postapi', args=[case_id]),
                                    data=json.dumps(posts),
                                    content_type='application/json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_transfer_advisory(self):

        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.api_key)

        form = [{"question": 'How are you?', "answer": 'Good'},
                {"question": 'How old are you?', "answer": '10'},
                {"question": "Provide hidden response", "answer": "this is private"}]
        report = {'report': form,
                  'source': 'anonymous',
                  'transfer_reason': 'because I need to test this.'}

        response = self.client.post(reverse('cvdp:transfer_reportapi'),
                               data=json.dumps(report),
                               content_type='application/json')
        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)
        self.assertContains(response, 'case_id', status_code=202)
        self.assertContains(response, 'status', status_code=202)
        case_id = response.data['case_id']

        advisory = {'title': 'this is an advisory',
                    'content': 'this is some content - woo woo'}

        response = self.client.post(reverse('cvdp:transfer_advisoryapi', args=[case_id]),
                                    data=json.dumps(advisory),
                                    content_type='application/json')
        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)


    def test_transfer_status(self):
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.api_key)

        self.api_client.force_authenticate(user=self.coord_user)

        form = [{"question": 'How are you?', "answer": 'Good'},
                {"question": 'How old are you?', "answer": '10'},
                {"question": "Provide hidden response", "answer": "this is private"}]
        report = {'report': form,
                  'source': 'anonymous',
                  'transfer_reason': 'because I need to test this.'}

        response = self.client.post(reverse('cvdp:transfer_reportapi'),
                               data=json.dumps(report),
                               content_type='application/json')

        self.assertContains(response, 'case_id', status_code=202)

        case_id = response.data['case_id']

        vul = Vulnerability.objects.filter(case=self.case).first()

        #coordinator has to retrieve vex...
        vex = self.api_client.get(reverse('cvdp:vexapi', args=[vul.id]))

        self.assertEqual(vex.status_code, status.HTTP_200_OK)
        self.assertContains(vex, '@context', status_code=200)
        self.assertContains(vex, 'statements', status_code=200)

        data  = {'vex': vex.data}
        post_response = self.client.post(reverse('cvdp:transfer_statusapi', args=[case_id]),
                                         data = json.dumps(data),
                                         content_type='application/json')
        self.assertEqual(post_response.status_code, status.HTTP_202_ACCEPTED)


    def test_transfer_status_fail(self):
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.api_key)

        self.api_client.force_authenticate(user=self.coord_user)

        form = [{"question": 'How are you?', "answer": 'Good'},
                {"question": 'How old are you?', "answer": '10'},
                {"question": "Provide hidden response", "answer": "this is private"}]
        report = {'report': form,
                  'source': 'anonymous',
                  'transfer_reason': 'because I need to test this.'}

        response = self.client.post(reverse('cvdp:transfer_reportapi'),
                               data=json.dumps(report),
                               content_type='application/json')

        self.assertContains(response, 'case_id', status_code=202)

        case_id = response.data['case_id']

        vul = Vulnerability.objects.filter(case=self.case).first()

        #coordinator has retrieve vex...
        vex = self.api_client.get(reverse('cvdp:vexapi', args=[vul.id]))

        self.assertEqual(vex.status_code, status.HTTP_200_OK)
        self.assertContains(vex, '@context', status_code=200)
        self.assertContains(vex, 'statements', status_code=200)

        data  = vex.data
        post_response = self.client.post(reverse('cvdp:transfer_statusapi', args=[case_id]),
                                         data = json.dumps(data),
                                         content_type='application/json')

        self.assertEqual(post_response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_transfer_status_vex_fail(self):
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.api_key)

        self.api_client.force_authenticate(user=self.coord_user)

        form = [{"question": 'How are you?', "answer": 'Good'},
                {"question": 'How old are you?', "answer": '10'},
                {"question": "Provide hidden response", "answer": "this is private"}]
        report = {'report': form,
                  'source': 'anonymous',
                  'transfer_reason': 'because I need to test this.'}

        response = self.client.post(reverse('cvdp:transfer_reportapi'),
                               data=json.dumps(report),
                               content_type='application/json')

        self.assertContains(response, 'case_id', status_code=202)

        case_id = response.data['case_id']

        data  = {'vex': {'something': 'something', 'somethingelse': 'somethingelse'}}
        post_response = self.client.post(reverse('cvdp:transfer_statusapi', args=[case_id]),
                                         data = json.dumps(data),
                                         content_type='application/json')

        self.assertEqual(post_response.status_code, status.HTTP_400_BAD_REQUEST)
        print(post_response.data)
