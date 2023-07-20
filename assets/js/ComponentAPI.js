import axios from 'axios';
const API_URL = process.env.API_URL || 'http://localhost:8000/advise';

axios.defaults.xsrfHeaderName = "X-CSRFToken"
axios.defaults.xsrfCookieName = 'csrftoken'


export default class ComponentAPI {

    constructor(){}

    getDependencies(item) {
	const url = `${API_URL}/api/components/${item}/dependency/`;
        return axios.get(url).then(response => response.data);
    }

    getComponentCases(c) {
	let url = `${API_URL}/api/components/${c.id}/cases/`;
	return axios.get(url).then(response => response.data);
    }

    getComponentActivity(c) {
	let url = `${API_URL}/api/component/${c.id}/activity/`;
        return axios.get(url).then(response => response.data);
    }
    
    getComponents(query) {
	let url = `${API_URL}/api/components/`;
	if (query) {
            url = `${API_URL}/api/components/?${query}`;
	}
        return axios.get(url).then(response => response.data);
    }

    getNextComponents(url) {
	return axios.get(url).then(response=>response.data);
    }
    
    getGroupComponents(c, query=null) {
	let url = `${API_URL}/api/group/${c}/components/`;
	if (query) {
	    url = `${API_URL}/api/group/${c}/components/?${query}`;
	}
        return axios.get(url).then(response => response.data);
    }

    getNextGroupComponents(url) {
	return axios.get(url).then(response=>response.data);
    }
    
    getComponentForm() {
	const url = `${API_URL}/components/add/`;
        return axios.get(url).then(response => response.data);
    }

    addGroupComponent(g, data) {
	const url = `${API_URL}/api/group/${g}/components/`;
        return axios.post(url, data).then(response=>response.data);
    }
    
    getEditComponentForm(c) {
        const url = `${API_URL}/components/${c}/edit/`;
	console.log(url);
        return axios.get(url).then(response => response.data);
    }
    
    addComponent(data) {
	const url = `${API_URL}/api/components/`;
        return axios.post(url, data).then(response=>response.data);
    }

    addDependency(item, deps) {
	const url = `${API_URL}/api/components/${item}/dependency/`;
	const data = {'dependency': deps[0]}
        return axios.all(deps.map((item) => {data.dependency=item; axios.patch(url, data)})).then((data) => data)
    }

    addOneDependency(item, data) {
	const url = `${API_URL}/api/components/${item}/dependency/`;
	return axios.patch(url, data);
    }

    getAddDependencyURL(item) {
	const url = `${API_URL}/api/components/${item}/dependency/`;
	return url;
    }
    
    updateComponent(c, data) {
	const url = `${API_URL}/api/component/${c}/`;
        return axios.patch(url, data).then(response=>response.data);
    }

    updateComponentOwner(data) {
	console.log(data);
	const url = `${API_URL}/components/update/owner/`;
        return axios.post(url, data);
    }
    
    removeComponents(c) {
	const requests = c.map((item) => `${API_URL}/api/component/${item}/`);
        return axios.all(requests.map((item) => axios.delete(item))).then((data) => data)
    }

    getComponentStatus(c) {
	const url = `${API_URL}/api/case/${c.case_id}/components/`;
        return axios.get(url).then(response => response.data);
    }

    getCompStatusUploads(c) {
	const url = `${API_URL}/api/case/${c.case_id}/status/transfers/`;
        return axios.get(url).then(response => response.data);
    }


    getComponentStatusActivity(c) {
	const url = `${API_URL}/api/case/component/${c}/status/revisions/`;
        return axios.get(url).then(response => response.data);
    }
    
    addStatus(c, data) {
	const url = `${API_URL}/api/case/${c.case_id}/components/`;
        return axios.post(url, data).then(response=>response.data);
    }

    removeStatus(c) {
	const url = `${API_URL}/api/case/component/${c}/status/`;
        return axios.delete(url).then(response=>response.data);
    }

    editStatus(c, data) {
        const url = `${API_URL}/api/case/component/${c.id}/status/`;
	return axios.patch(url, data).then(response=>response.data);
    }

    loadSPDX(data, group=null) {
	let url = `${API_URL}/api/components/upload/`;
	if (group) {
	    url = `${API_URL}/api/components/group/${group}/upload/`;
	}
	return axios.post(url, data, {
            headers: {
		'Content-Type': 'multipart/form-data'
            }}).then(response => response.data);
    }
    
    getSPDX(c, format="json") {
	let url = `${API_URL}/component/${c.id}/sbom/download/?format=${format}`;
        return axios.get(url, {responseType: 'blob'})
    }

    mergeStatus(id) {
	let formField = new FormData();
        formField.append('merged', 1);
	let url = `${API_URL}/api/case/status/transfer/${id}/`;
	return axios.patch(url, formField).then(response => response.data);
    }

    rejectStatus(id) {
	let formField = new FormData();
	formField.append('deleted', 1);
	let url = `${API_URL}/api/case/status/transfer/${id}/`;
        return axios.patch(url, formField).then(response => response.data);	
    }
}

