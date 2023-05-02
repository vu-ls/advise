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
    
    getGroupComponents(c) {
	const url = `${API_URL}/api/group/${c}/components/`;
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

}

