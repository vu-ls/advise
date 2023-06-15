import axios from 'axios';
const API_URL = process.env.API_URL || 'http://localhost:8000/advise';


export default class CVEAPI{

    constructor(org_name, user, api_key, url) {
	this.org_name = org_name;
	this.user = user;
	this.api_key = api_key;
	this.url = url;
	this.user_path = "/org/"+this.org_name+"/user/"+this.user;
	this.headers = { headers: {'CVE-API-KEY': this.api_key,
				   'CVE-API-ORG': this.org_name,
				   'CVE-API-USER': this.user },
		       }
    }

    getORG() {
	let url = `${this.url}org/${this.org_name}`;
	return axios.get(url, this.headers);
    }
    
    getUser(username) {
	let url = this.user_path;
	if (username) {
	    url = `${this.url}org/${this.org_name}/user/${username}`;
	}
	console.log(url);
	console.log(this.headers);
	return axios.get(url, this.headers)
    }

    listUsers() {
	let url = `${this.url}org/${this.org_name}/users`;
	return axios.get(url, this.headers).then(response => response.data);
    }

    listCVEs() {
	let url = `${this.url}cve-id/`;
	return axios.get(url, this.headers).then(response => response.data);
    }

    resetKey(username) {
	let url = `${this.url}org/${this.org_name}/user/${username}/reset_secret`;
	return axios.put(url, null, this.headers).then(response=>response.data);
    }


    getCVEMeta(id) {
	let url = `${this.url}cve-id/${id}`;
        return axios.get(url, this.headers).then(response => response.data);
    }
    getCVE(id) {
	let url = `${this.url}cve/${id}`;
        return axios.get(url, this.headers).then(response => response.data);
    }

    getCVEsByYear(year) {
	let url = `${this.url}cve-id?cve_id_year=${year}`;
        return axios.get(url, this.headers).then(response => response.data);
    }

    addUser(data) {
	let url = `${this.url}org/${this.org_name}/user`;
	return axios.post(url, data, this.headers).then(response=>response.data);
    }

    editUser(username, data) {
	let params = new URLSearchParams();
	Object.keys(data).forEach(function(v) {
	    params.append(v, data[v]);
	});
	params = params.toString();
	let url = `${this.url}org/${this.org_name}/user/${username}?` + params;
	return axios.put(url, null, this.headers).then(response=>response.data);
    }

    deactivateUser(username) {
        const params = new URLSearchParams({
            'active': false
        }).toString();
        let url = `${this.url}org/${this.org_name}/user/${username}?` + params;
        return axios.put(url, null, this.headers).then(response=>response.data);
    }

   reactivateUser(username) {
       const params = new URLSearchParams({
           'active': true
       }).toString();
       let url = `${this.url}org/${this.org_name}/user/${username}?` + params;
       return axios.put(url, null, this.headers).then(response=>response.data);
   }


    reserve1CVE() {
	let currentYear = new Date().getFullYear();
	const params = new URLSearchParams({
            'amount': 1,
            'batch_type': 'Sequential',
            'cve_year': currentYear,
            'short_name': this.org_name
        }).toString();
        let url = `${this.url}cve-id?` + params;
        return axios.post(url, null, this.headers)
    }
    
    reserveCVEs(data) {
	const params = new URLSearchParams({
	    'amount': data.amount,
	    'batch_type': data.batch_type,
	    'cve_year': data.cve_year,
	    'short_name': data.short_name
        }).toString();
        let url = `${this.url}cve-id?` + params;
        return axios.post(url, null, this.headers).then(response=>response.data);
    }

    publishCVE(cve, data) {

	let url = `${this.url}cve/${cve}/cna`;
	return axios.post(url, data, this.headers)
    }
	
    
    
}

