import MockPromise from "../../testUtils/MockPromise";


const mockcasejson = {
    case_id: "312650",
    case_identifier: "CASE#312650",
    owners: [
        {
            id: 1,
            name: "emily",
            org: "",
            photo:
            "/media/user_logos/54b2bf17-10a1-45aa-91c4-d37bab92f661/vu.ls.png",
            logocolor: "#7FF3AE",
            title: "",
            contact: "54b2bf17-10a1-45aa-91c4-d37bab92f661",
        },
    ],
    created: "2023-08-09T14:02:01.137269Z",
    created_by: null,
    modified: "2023-09-07T16:06:21.826199Z",
    status: "Active",
    title: "Airpods v.1.2.3",
    summary: "This is a vulnerability about Airpods",
    report: {
	received: "2023-08-09T14:02:01.124813Z",
	title: "Vulnerability Report",
	case_url: "",
	source: null,
	submitter: "emily",
	report: [
            {
		priv: false,
                answer: ["No"],
                question: "Have you tried to contact the vendor?",
            },
            {
                priv: false,
                answer: "Airpods",
                question: "What is the name of the affect product or software?",
            },
        ],
    },
    public_date: null,
    due_date: "2023-09-23T14:02:01.156086Z",
    advisory_status: "PENDING",
};

const mockcaseresults = {
    count: 1,
    results: [
	mockcasejson
    ],
};


const mockactivity = {
      user: {
          id: 33,
          name: "bing",
          org: null,
          photo: null,
          logocolor: "#F2D820",
          title: null,
          contact: "fe083186-85b2-47d0-8690-0fe4312b1ec5",
      },
      title:
      "added Affected status for vul CVE-2023-21127 and component something 1.2.3",
      created: "2023-09-07T16:06:21.822472Z",
      url: "/advise/cases/312650",
      change: [],
  };



const mocksearchresults = {
        count: 1,
        next: null,
        previous: null,
        results: [mockcasejson]
        }

const mockactivityresults = {
	results: [
	    mockactivity
	],
	next_page: null
};

export const mockSearchCasesFn = jest.fn();

const mock = jest.fn().mockImplementation(() => {

    return {
	getMyCases: (search) => {
	    console.log(`SEARCH IS ${search}`);
	    if (search == "search=something") {
		return Promise.resolve([]);
	    }else {
		return Promise.resolve(mocksearchresults);
	    }
	},

	searchCases: () => {
	    return Promise.resolve(mockcaseresults);
	},
	getMyActivity: () => {
	    return Promise.resolve({data: mockactivityresults});
	},
	getCasesByPage: () => {
	    return Promise.resolve(mockcaseresults);
	},
	/*for DashboardList.test.js -> mock error first, then mock results */
	getMyCasesByPage: jest.fn().mockImplementationOnce(()=> {return Promise.reject(new Error("something bad"))}).mockReturnValue(Promise.resolve(mockcaseresults)),
	    //return Promise.resolve(mockcaseresults);
	getCase: (case_id) => {
	    return Promise.resolve(mockcasejson);
	},
	getUserCaseState: () => {
	    return Promise.resolve(
		{
		    user: {
			id: 1,
			name: "emily",
			org: "",
			photo: "http://localhost:8000/media/user_logos/54b2bf17-10a1-45aa-91c4-d37bab92f661/vu.ls.png",
			logocolor: "#7FF3AE",
			title: "",
			contact: "54b2bf17-10a1-45aa-91c4-d37bab92f661"
		    },
		    contact: "54b2bf17-10a1-45aa-91c4-d37bab92f661",
		    last_viewed: "2023-09-13T14:20:36.175439Z",
		    delete_perm: true,
		    role: "owner",
		    status_needed: false
		}
	    );
	},
	getCaseOwners: () => {
	    return Promise.resolve(
		[
		    {
			id: 125,
			name: "emily",
			participant_type: "user",
			added_by: "emily",
			photo: "/media/user_logos/54b2bf17-10a1-45aa-91c4-d37bab92f661/vu.ls.png",
			logocolor: "#7FF3AE",
			  role: "owner",
			uuid: "54b2bf17-10a1-45aa-91c4-d37bab92f661",
			added: "2023-09-06T18:49:59.844592Z",
			notified: "2023-09-06T18:49:59.846409Z",
			  roles_available: [
			      "owner",
			      "supplier",
			      "reporter",
			      "observer",
			      "participant"
			  ],
			users: []
		      }
		]);
	},

	getUserAssignments: () => {
	    return Promise.resolve({
		roles: ['Admins', 'Coordinators'],
		users: []
	    })
	},

	getThreads: () => {
	    return Promise.resolve(
		[]);
	},

	getCWEs: () => {
	    return Promise.resolve([])
	},

	getCaseActivity: () => {
	    return Promise.resolve({
		results: []
	    })
	},

	getVuls: () => {
	    return Promise.resolve([])
	},

	getArtifacts: () => {
	    return Promise.resolve([])
	},
	
	
    }
});

//export {mockCaseAPI, mockActivityAPI};
export default mock;
