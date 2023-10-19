import json
from rest_framework import status
from rest_framework.test import APIClient, APITestCase
from django.test import TestCase, Client, modify_settings
from django.urls import reverse, reverse_lazy
from django.utils import timezone
from adscore.models import *
from adscore.serializers import *
from authapp.models import APIToken, User


class AdScoreTests(TestCase):

    def setUp(self):
        self.api_client = APIClient()
        self.coord_user = User.objects.create(email='coordinator', password='Pas$w0rd', is_coordinator=True)
        self.other_user = User.objects.create(email='somebody', password='S0mEb0dy')
        self.coord_user_two = User.objects.create(email='coord_two', password='Pas$w0rd', is_coordinator=True)

        #add some vuls
        vul = Vul.objects.create(cve='CVE-2023-1234', description='something')
        vul2 = Vul.objects.create(cve='CVE-2022-1234', description='blah blah')
        vul3= Vul.objects.create(cve='CVE-2021-1234', description='fun fun fun')
        vul4 = Vul.objects.create(cve='CVE-2020-1234', description='joe bob sally')

    def test_coordinator_get_vuls(self):

        self.api_client.force_authenticate(user=self.coord_user)

        response = self.api_client.get(
            reverse('adscore:vulsapi'))

        vuls = Vul.objects.all()
        serializer = AdScoreSerializer(vuls, many=True)

        self.assertEqual(response.data['results'], serializer.data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)


    def test_other_user_get_vuls(self):

        self.api_client.force_authenticate(user=self.other_user)

        response = self.api_client.get(
            reverse('adscore:vulsapi'))

        vuls = Vul.objects.all()
        serializer = AdScoreSerializer(vuls, many=True)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_score_vul(self):

        self.api_client.force_authenticate(user=self.coord_user)

        response = self.api_client.patch(
            reverse('adscore:scoreapi', args=['CVE-2023-1234']),
            data=json.dumps({
                "justifications": {},
                "ssvc_decision_tree": [
                    {
                        "label": "Exploitation",
                        "value": "active"
                    },
                    {
                        "label": "Automatable",
                        "value": "yes"
                    },
                    {
                        "label": "Technical Impact",
                        "value": "total"
                    },
                    {
                        "label": "Public Well-being Impact",
                        "value": "Material"
                    },
                    {
                        "label": "Mission Prevalence",
                        "value": "Essential"
                    },
                    {
                        "label": "Mission & Well-being",
                        "value": "high"
                    },
                    {
                        "label": "Decision",
                        "value": "Act"
                    }
                ],
                "tree_type": "CISA-Coordinator-v2.0.3",
                "ssvc_decision": "Act",
                "ssvc_vector": "SSVC/v2/E:A/A:Y/T:T/B:A/P:E/M:H/D:C/2023-10-30T19:48:44Z/"
            }),
            content_type='application/json')
        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)

        #get score activity
        response = self.api_client.get(
            reverse('adscore:score-activity', args=['CVE-2023-1234']))

        vuls = SSVCScoreActivity.objects.filter(score__vul__cve='CVE-2023-1234')
        serializer = ScoreActivitySerializer(vuls, many=True)

        self.assertEqual(response.data, serializer.data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        #remove the score

        response = self.api_client.delete(
            reverse('adscore:scoreapi', args=['CVE-2023-1234']))

        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)

        #get the score
        response = self.api_client.get(
	    reverse('adscore:vul_edit_lock', args=['CVE-2023-1234']))

        self.assertEqual(response.data['ssvcscore'], None)


    def test_lock_vul(self):

        self.api_client.force_authenticate(user=self.coord_user)

        response = self.api_client.patch(
            reverse('adscore:vul_edit_lock', args=['CVE-2023-1234']),
            data=json.dumps({
                "lock": 1,
                }),
            content_type = 'application/json')

        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)

        #now other coord user should try to lock this vul

        self.api_client.force_authenticate(user=self.coord_user_two)

        response = self.api_client.patch(
            reverse('adscore:vul_edit_lock', args=['CVE-2023-1234']),
            data=json.dumps({
	        "lock": 1,
                }),
            content_type = 'application/json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        self.api_client.force_authenticate(user=self.coord_user)

        response = self.api_client.patch(
            reverse('adscore:scoreapi', args=['CVE-2023-1234']),
            data=json.dumps({
                "justifications": {},
                "ssvc_decision_tree": [
                    {
                        "label": "Exploitation",
                        "value": "active"
                    },
                    {
                        "label": "Automatable",
                        "value": "yes"
                    },
                    {
                        "label": "Technical Impact",
                        "value": "total"
                    },
                    {
                        "label": "Public Well-being Impact",
                        "value": "Material"
                    },
                    {
                        "label": "Mission Prevalence",
                        "value": "Essential"
                    },
                    {
                        "label": "Mission & Well-being",
                        "value": "high"
                    },
                    {
                        "label": "Decision",
                        "value": "Act"
                    }
                ],
                "tree_type": "CISA-Coordinator-v2.0.3",
                "ssvc_decision": "Act",
                "ssvc_vector": "SSVC/v2/E:A/A:Y/T:T/B:A/P:E/M:H/D:C/2023-10-30T19:48:44Z/"
            }),
            content_type='application/json')

        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)

	#now other coord user should try to lock this vul
        self.api_client.force_authenticate(user=self.coord_user_two)

        response = self.api_client.patch(
            reverse('adscore:vul_edit_lock', args=['CVE-2023-1234']),
            data=json.dumps({
		"lock": 1,
		}),
            content_type = 'application/json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_case_from_vul(self):

        self.api_client.force_authenticate(user=self.coord_user)

        response = self.api_client.post(
            reverse('adscore:vul_edit_lock', args=['CVE-2023-1234']),
            data={},
            content_type = 'application/json')

        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)
        self.assertIn('case', response.data)

        
