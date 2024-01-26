import React from "react";
import CaseApp from "./CaseApp";
import { render, fireEvent, waitFor, screen, waitForElementToBeRemoved } from "@testing-library/react";

import { MemoryRouter } from "react-router-dom";
import userEvent from "@testing-library/user-event";
import data from "../testUtils/MockCaseInfo.json";
import axios from "axios";
import MockAdapter from "axios-mock-adapter";
import { cleanup } from "@testing-library/react";
HTMLCanvasElement.prototype.getContext = jest.fn();
const mock = new MockAdapter(axios, { onNoMatch: "throwException" });


document.execCommand = jest.fn()
window.HTMLElement.prototype.scrollIntoView = jest.fn()


describe("Case Detail Component", () => {

    afterEach(() => {
        cleanup;
        mock.reset();
        mock.resetHistory();
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("should render report and allow for edits", async () => {

        mock.onGet("http://localhost:8000/advise/api/cases/310363/").reply(
            200,
            data['case']
        );
        mock.onGet(
            "http://localhost:8000/advise/api/case/310363/participants/?role=owner"
        ).reply(200, data['owners']);
        
        mock.onGet("http://localhost:8000/advise/api/case/310363/user/")
            .reply(200, data['usercasestate'])


        mock.onGet("http://localhost:8000/advise/api/case/310363/threads/")
        .reply(200, data['threads'])

        mock.onGet("http://localhost:8000/advise/api/case/thread/149/posts/")
        .reply(200, data['posts'])
        mock.onGet('http://localhost:8000/advise/api/case/thread/149/participants/')
        .reply(200, data['caseparticipants'])
        .onAny()
        .reply(200, []);

        
        const user = userEvent.setup();
        const { container } = render(
            <MemoryRouter initialEntries={["/advise/cases/310363"]}>
            <CaseApp />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText(/CASE#310363/i)).toBeInTheDocument();
            expect(screen.getByText("Original Report")).toBeInTheDocument();
            expect(screen.getByText(/Have you tried to contact the vendor?/i)).toBeInTheDocument();
            expect(container.querySelector("#detail-dropdown")).toBeInTheDocument()
            user.click(container.querySelector("#detail-dropdown"));
        });

        await waitFor(() => {
            expect(screen.getByText(/Edit Report/i)).toBeInTheDocument();
            /* can't follow link for now */
            //user.click(container.querySelector("#detail-dropdown"));
        });
        
       // await waitForElementToBeRemoved(() => screen.getByText(/Edit Report/));

       mock.reset();
       mock.resetHistory();
       let revised_case = data['case'];
       revised_case['title'] = "My Case Title"
       mock.onPatch("http://localhost:8000/advise/api/cases/310363/")
       .reply(200, [])
       mock.onGet("http://localhost:8000/advise/api/cases/310363/")
       .reply(200, revised_case)
       .onAny().reply(200, []);

        await waitFor(() => {
            user.click(screen.getByText("Add Case Details"));
        })
        await waitFor(() => {
            expect(screen.getAllByText(/title/i)).toHaveLength(2);
            expect(screen.getAllByText(/Summary/i)).toHaveLength(2);
            fireEvent.change(screen.getByLabelText('Title'), {
                target: 
                {value: 'My Case Title'}
            });
            fireEvent.click(screen.getAllByRole('button', {name:/Submit/})[0])
        })
        
        await waitFor(() => {
            expect(screen.getAllByText(/My Case Title/i)).toHaveLength(2);

        })
        await waitFor(() => {
            //expect(screen.getByText(/Got it/i)).toBeInTheDocument(); 
            expect(mock.history.patch.length).toBe(1);
        });



    });

    it("should render vuls and allow for edits", async () => {

        mock.onGet("http://localhost:8000/advise/api/cases/310363/").reply(
            200,
            data['case']
        );
        mock.onGet(
            "http://localhost:8000/advise/api/case/310363/participants/?role=owner"
        ).reply(200, data['owners']);
        
        mock.onGet("http://localhost:8000/advise/api/case/310363/user/")
            .reply(200, data['usercasestate'])


        mock.onGet("http://localhost:8000/advise/api/case/310363/threads/")
        .reply(200, data['threads'])

        mock.onGet("http://localhost:8000/advise/api/case/thread/149/posts/")
        .reply(200, data['posts'])
        mock.onGet('http://localhost:8000/advise/api/case/thread/149/participants/')
        .reply(200, data['caseparticipants'])
        mock.onGet('http://localhost:8000/advise/api/case/310363/vuls/')
        .reply(200, data['vuls'])
        .onAny()
        .reply(200, []);

        const user = userEvent.setup();
        const { container } = render(
            <MemoryRouter initialEntries={["/advise/cases/310363"]}>
            <CaseApp />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByRole('tab', {name:/Vulnerabilities/})).toBeInTheDocument();
            expect(screen.getByText('CVE-9999-21127')).toBeInTheDocument();
            user.click(screen.getByRole('tab', {name:/Vulnerabilities/}));
        });

        await waitFor(() => {
            expect(screen.getByText('CVE-9999-21128')).toBeInTheDocument();
            user.click(screen.getByRole('button', {name:/CVE-9999-21128/}));
        })
        await waitFor(() => {
            expect(screen.getAllByText(/this is a new one/i)).toHaveLength(2);
            const option_btns = screen.getAllByRole('button', {name:/Options/});
            expect(option_btns).toHaveLength(2);
            user.click(option_btns[1]);
        })       
         await waitFor(() => {
            expect(screen.getByText(/Edit/i)).toBeInTheDocument();
            user.click(screen.getByText(/Edit/i));
        })
        
        await waitFor(() => {
            expect(screen.getByText(/Edit Vulnerability CVE-9999-21128/i)).toBeInTheDocument();
            expect(screen.getByLabelText('Tags')).toBeInTheDocument();
            expect(screen.getByRole('button', {name:/Save Vulnerability/i})).toBeInTheDocument();
            expect(screen.getByTestId('cancel-editvul')).toBeInTheDocument();
            user.click(screen.getByTestId('cancel-editvul'))
        })
        
        await waitForElementToBeRemoved(() => screen.getByText(/Edit Vulnerability CVE-9999-21128/i));

        await waitFor(() => {
            const option_btns = screen.getAllByRole('button', {name:/Options/});
            user.click(option_btns[1]);
        })       
         await waitFor(() => {
            expect(screen.getByText(/Edit/i)).toBeInTheDocument();
            user.click(screen.getByText(/Edit/i));
        })
        mock.reset();
        mock.resetHistory();

        mock.onPatch("http://localhost:8000/advise/api/vul/109")
        .reply(200, [])
        let revised_vuls = data['vuls'];
        revised_vuls[1]['description']="Here is a new vul description"
        mock.onGet('http://localhost:8000/advise/api/case/310363/vuls/')
        .reply(200, data['vuls'])
        mock.onGet("http://localhost:8000/advise/api/cases/310363/")
        .reply(200, data['case'])
        .onAny().reply(200, []);

        await waitFor(() => {
            expect(screen.getByText(/Edit Vulnerability CVE-9999-21128/i)).toBeInTheDocument();
            expect(screen.getByRole('button', {name:/Sync CVE/i})).toBeInTheDocument();
            fireEvent.change(screen.getByLabelText(/Vulnerability Description/i), {
                target: 
                {value: 'Here is a new vul description'}
            });
            expect(screen.getByRole('button', {name:/Save Vulnerability/i})).toBeInTheDocument();
            user.click(screen.getByRole('button', {name:/Save Vulnerability/i}));
        })

        await waitForElementToBeRemoved(() => screen.getByText(/Edit Vulnerability CVE-9999-21128/i));

        await waitFor(() => {
            expect(screen.getAllByText(/Here is a new vul description/)).toHaveLength(2);

        })

        /*add a new vul */
        await waitFor(() => {
            expect(container.querySelector("#vul-dropdown")).toBeInTheDocument()
            user.click(container.querySelector("#vul-dropdown"));
        });

        await waitFor(() => {
            expect(screen.getByText(/Add Vul/i)).toBeInTheDocument();
            user.click(screen.getByText(/Add Vul/i));

        });

        mock.reset();
        mock.resetHistory();

        let vuls_added = data['vuls'];
        vuls_added.push({
            "id": 115,
            "cve": "9999-1111",
            "description": "Here is a the vul description for the new CVE",
            "vul": "CVE-9999-1111",
            "date_added": "2023-08-09T15:19:28.304762Z",
            "date_public": null,
            "problem_types": null,
            "references": null,
            "tags": [],
            "cvss_vector": null,
            "cvss_severity": null,
            "cvss_score": null,
            "ssvc_vector": null,
            "ssvc_decision": null,
            "ssvc_decision_tree": null,
            "affected_products": [],
            "case": "CASE#312650",
            "url": "/advise/cases/312650"
        })

	let currentYear = new Date().getFullYear();
        mock.onGet("http://localhost:8000/advise/api/manage/cve/account/?active=true")
        .reply(200, data['cveaccounts'])
        mock.onPost(`somethingcve-id?amount=1&batch_type=Sequential&cve_year=${currentYear}&short_name=orgname`)
        .reply(200, {"cve_ids": [{"cve_id": "CVE-9999-1111"}]})
        mock.onGet("http://localhost:8000/advise/api/cases/310363/")
        .reply(200, data['case'])
        mock.onPost('http://localhost:8000/advise/api/case/310363/vuls/')
        .reply(200, [])
        mock.onGet('http://localhost:8000/advise/api/case/310363/vuls/')
        .reply(200, vuls_added)
        .onAny().reply(200, [])
  

        await waitFor(() => {
            expect(screen.getByText(/Add a new vulnerability/i)).toBeInTheDocument();
            expect(screen.getByRole('button', {name:/Reserve CVE/i})).toBeInTheDocument();
            expect(screen.getByLabelText(/Vulnerability Description/)).toBeInTheDocument();
            user.click(screen.getByRole('button', {name:/Reserve CVE/i}));
        })

        await waitFor(() => {
            expect(screen.getAllByText(/CVE-9999-1111/)).toHaveLength(1);
            expect(mock.history.post.length).toBe(1);
            expect(mock.history.get.length).toBe(1);
            fireEvent.change(screen.getByTestId("vuldescription"), {
                target: 
                {value: 'Here is a the vul description for the new CVE'}
            });
            user.click(screen.getByTestId('submit-vul'))
        })
        await waitForElementToBeRemoved(() => screen.getByText('Add a new vulnerability'));

        await waitFor(() => {
            expect(screen.getByText('CVE-9999-1111')).toBeInTheDocument();
        });

        /*make sure cancel button works */
        await waitFor(() => {
            expect(container.querySelector("#vul-dropdown")).toBeInTheDocument()
            user.click(container.querySelector("#vul-dropdown"));
        });

        await waitFor(() => {
            expect(screen.getByText(/Add Vul/i)).toBeInTheDocument();
            user.click(screen.getByText(/Add Vul/i));
        });

        await waitFor(() => {
            expect(screen.getByText(/Add a new vulnerability/i)).toBeInTheDocument();
            user.click(screen.getByTestId("cancel-add-vul"));
        });


        await waitForElementToBeRemoved(() => screen.getByText(/Add a new vulnerability/i));
        

        /* change timeout since this is a longer test */
    }, 10000);


    it("should render vuls and allow for removal", async () => {

        mock.reset();
        mock.onGet("http://localhost:8000/advise/api/cases/310363/").reply(
            200,
            data['case']
        );
        mock.onGet(
            "http://localhost:8000/advise/api/case/310363/participants/?role=owner"
        ).reply(200, data['owners']);
        
        mock.onGet("http://localhost:8000/advise/api/case/310363/user/")
            .reply(200, data['usercasestate'])


        mock.onGet("http://localhost:8000/advise/api/case/310363/threads/")
        .reply(200, data['threads'])

        mock.onGet("http://localhost:8000/advise/api/case/thread/149/posts/")
        .reply(200, data['posts'])
        mock.onGet('http://localhost:8000/advise/api/case/thread/149/participants/')
        .reply(200, data['caseparticipants'])
        mock.onGet('http://localhost:8000/advise/api/case/310363/vuls/')
        .reply(200, data['vuls'])
        .onAny()
        .reply(200, []);

        const user = userEvent.setup();
        const { container } = render(
            <MemoryRouter initialEntries={["/advise/cases/310363"]}>
            <CaseApp />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByRole('tab', {name:/Vulnerabilities/})).toBeInTheDocument();
            expect(screen.getByText('CVE-9999-21127')).toBeInTheDocument();
            user.click(screen.getByRole('tab', {name:/Vulnerabilities/}));
        });

        await waitFor(() => {
            expect(screen.getAllByText(/Here is a new vul description/i)).toHaveLength(2);
            const option_btns = screen.getAllByRole('button', {name:/Options/});
            expect(option_btns).toHaveLength(3);
            user.click(option_btns[1]);
        })       
        await waitFor(() => {
            expect(screen.getByText(/Delete/i)).toBeInTheDocument();
            user.click(screen.getByText(/Delete/i));
        });

        await waitFor(() => {
            expect(screen.getByText(/Confirm this action/i)).toBeInTheDocument();
            expect(screen.getByTestId("cancel-confirm")).toBeInTheDocument();
            user.click(screen.getByTestId("cancel-confirm"));
        });

        await waitForElementToBeRemoved(() => screen.getByText(/Confirm this action/i))

        await waitFor(() => {
            /* make sure cancel worked and it didn't remove anything */
            expect(screen.getAllByText(/Here is a new vul description/i)).toHaveLength(2);
        })
       
        mock.resetHistory();
        /* now actually remove it */
        await waitFor(() => {
            expect(screen.getAllByText(/Here is a new vul description/i)).toHaveLength(2);
            const option_btns = screen.getAllByRole('button', {name:/Options/});
            expect(option_btns).toHaveLength(3);
            user.click(option_btns[1]);
        })       
        await waitFor(() => {
            expect(screen.getByText(/Delete/i)).toBeInTheDocument();
            user.click(screen.getByText(/Delete/i));
        });

        await waitFor(() => {
            expect(screen.getByText(/Confirm this action/i)).toBeInTheDocument();
            expect(screen.getByTestId("confirm-cancel")).toBeInTheDocument();
            user.click(screen.getByTestId("confirm-cancel"));
        });

        await waitForElementToBeRemoved(() => [screen.getByText(/Confirm this action/i), screen.getAllByText(/Here is a new vul description/)])

        await waitFor(() => {
            const option_btns = screen.getAllByRole('button', {name:/Options/});
            expect(option_btns).toHaveLength(2);
            expect(mock.history.delete.length).toBe(1);

        })

    });


    it("should render vuls and allow the user to score them", async () => {
        
        mock.onGet("http://localhost:8000/advise/api/cases/310363/").reply(
            200,
            data['case']
        );
        mock.onGet(
            "http://localhost:8000/advise/api/case/310363/participants/?role=owner"
        ).reply(200, data['owners']);
        
        mock.onGet("http://localhost:8000/advise/api/case/310363/user/")
            .reply(200, data['usercasestate'])


        mock.onGet("http://localhost:8000/advise/api/case/310363/threads/")
        .reply(200, data['threads'])

        mock.onGet("http://localhost:8000/advise/api/case/thread/149/posts/")
        .reply(200, data['posts'])
        mock.onGet('http://localhost:8000/advise/api/case/thread/149/participants/')
        .reply(200, data['caseparticipants'])
        mock.onGet('http://localhost:8000/advise/api/case/310363/vuls/')
        .reply(200, data['vuls'])
        .onAny()
        .reply(200, []);

        const user = userEvent.setup();
        const { container } = render(
            <MemoryRouter initialEntries={["/advise/cases/310363"]}>
            <CaseApp />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByRole('tab', {name:/Vulnerabilities/})).toBeInTheDocument();
            expect(screen.getByText('CVE-9999-21127')).toBeInTheDocument();
            user.click(screen.getByRole('tab', {name:/Vulnerabilities/}));
        });

        await waitFor(() => {
            expect(screen.getAllByText(/Here is a new vul description/i)).toHaveLength(2);
            const option_btns = screen.getAllByRole('button', {name:/Options/});
            expect(option_btns).toHaveLength(3);
            user.click(option_btns[1]);
        })       
        await waitFor(() => {
            expect(screen.getByText(/Score/i)).toBeInTheDocument();
            user.click(screen.getByText(/Score/i));
        });

        await waitFor(() => {
            expect(screen.getByText(/Score the vulnerability/i)).toBeInTheDocument();
            expect(screen.getByRole('tab', {name:/CVSS/})).toBeInTheDocument();
            expect(screen.getByRole('tab', {name:/SSVC/})).toBeInTheDocument();
            user.click(screen.getByRole('tab', {name:/SSVC/}))

        });

        await waitFor(() => {
            expect(screen.getByText(/Currently using/)).toBeInTheDocument();
            expect(screen.getByRole('button', {name:/Exploitation/i})).toBeInTheDocument();
            user.click(screen.getByRole('button', {name:/Exploitation/i}));
        });

        await waitFor(() => {
            /* exploitation explanation popup */
	    expect(screen.getByText('poc')).toBeInTheDocument();
	});
	/*
	await waitFor(() => {
            expect(screen.getByText(/There is no evidence/)).toBeInTheDocument();
            user.click(screen.getByRole('button', {name:/Exploitation/i}))
        })
	*/
        /* now go away */
	/*
          await waitForElementToBeRemoved( () => screen.getByText(/There is no evidence/));*/
        await waitFor(() => {
            user.click(screen.getByLabelText('none'));
        })
        await waitFor(() => {
            expect(screen.getByRole('button', {name:/Automatable/i})).toBeInTheDocument();
            user.click(screen.getByLabelText('yes'));
        })
        await waitFor(() => {
            expect(screen.getByRole('button', {name:/Technical Impact/i})).toBeInTheDocument();
            user.click(screen.getByLabelText('partial'));
        })
        await waitFor(() => {
            expect(screen.getByRole('button', {name:/Mission Prevalence/i})).toBeInTheDocument();
            user.click(screen.getByLabelText('Support'));
        })
	await waitFor(() => {
            expect(screen.getByRole('button', {name:/Public Well-being Impact/i})).toBeInTheDocument();
            user.click(screen.getByLabelText('Material'));
        })

        mock.reset();
        let revised_vuls = data['vuls'];
        revised_vuls[1]['ssvc_vector']= 'SSVC/v2/E:N/A:Y/T:P/B:M/P:S/M:M/D:T/2023-10-03T13:08:34Z/'
        revised_vuls[1]['ssvc_decision']= 'Track'
        revised_vuls[1]['ssvc_decision_tree'] = data['ssvc']

        mock.onPost("http://localhost:8000/advise/api/case/vul/109/ssvc/")
        .reply(200, [])
        mock.onGet('http://localhost:8000/advise/api/case/310363/vuls/')
        .reply(200, revised_vuls)
        /*mock.onGet("http://localhost:8000/advise/case/vul/109/cvss/")
        .reply(200, cvssform['cvssform'])*/
        await waitFor(() => {
            expect(screen.getByText(/Mission & Well-being is medium/i)).toBeInTheDocument();
            expect(screen.getByText(/Decision is track/i)).toBeInTheDocument();
            user.click(screen.getByRole('button', {name:/Save Score/i}));
        }) 

        await waitForElementToBeRemoved(() => screen.getByText(/Score the vulnerability/i));

        await waitFor(() => {
            expect(screen.getByText(/SSVC Decision Tree/)).toBeInTheDocument();
            expect(screen.getAllByText(/Decision/i)).toHaveLength(2);
            expect(screen.getByText(/Track/i)).toBeInTheDocument();

        })
        
        mock.onGet("http://localhost:8000/advise/api/manage/cve/account/?active=true")
        .reply(200, data['cveaccounts'])
        mock.onGet("https://cveawg.mitre.org/api/cve/CVE-9999-21128")
        .reply(200, data['getCVE'])
        mock.onGet("somethingorg/orgname")
        .reply(200, [])

        await waitFor(() => {
            const option_btns = screen.getAllByRole('button', {name:/Options/});
            expect(option_btns).toHaveLength(3);
            user.click(option_btns[1]);
        })       
        await waitFor(() => {
            expect(screen.getByText(/Publish/i)).toBeInTheDocument();
            user.click(screen.getByText(/Publish/i));
        });

        await waitFor(() => {
            expect(screen.getByText(/Publish CVE-9999-21128/i)).toBeInTheDocument();
            expect(screen.getByText(/Publish CVE Record/i)).toBeInTheDocument();
            expect(screen.getByText(/Publish ADP Record/i)).toBeInTheDocument();
            expect(screen.getByText(/MISSING REFERENCES/i)).toBeInTheDocument();
            expect(screen.getAllByRole('button', {name:/Publish/})[1]).toHaveAttribute('disabled');


        })

        /*CVSS is currently a form imported from django so it can't be tested here. */
        /*
        await waitFor(() => {
            expect(screen.getByText(/Score the vulnerability/i)).toBeInTheDocument();
            user.click(document.querySelector("#AV_A"));
            user.click(screen.getByTestId('score-submit'));
        });
        await waitFor(() => {
            expect(screen.getByText(/All fields are required/i)).toBeInTheDocument();
            user.click(document.querySelector("#AC_H"));
            user.click(document.querySelector("#PR-N"));
            user.click(document.querySelector("#UI-N"));
            user.click(document.querySelector("#S-C"));
            user.click(document.querySelector("#C-L"));
            user.click(document.querySelector("#I-H"));
            user.click(document.querySelector("#A-L"));
            user.click(screen.getByTestId('score-submit'));
        })

        await waitFor(() => {
            expect(screen.getAllByText('CVSS')).toHaveLength(4);
        })
        */

        /* also long test */
    }, 10000);

    it("should render case status and components", async () => {
        
        mock.onGet("http://localhost:8000/advise/api/cases/310363/").reply(
            200,
            data['case']
        );
        mock.onGet(
            "http://localhost:8000/advise/api/case/310363/participants/?role=owner"
        ).reply(200, data['owners']);
        
        mock.onGet("http://localhost:8000/advise/api/case/310363/user/")
            .reply(200, data['usercasestate'])


        mock.onGet("http://localhost:8000/advise/api/case/310363/threads/")
        .reply(200, data['threads'])

        mock.onGet("http://localhost:8000/advise/api/case/thread/149/posts/")
        .reply(200, data['posts'])
        mock.onGet('http://localhost:8000/advise/api/case/thread/149/participants/')
        .reply(200, data['caseparticipants'])
        mock.onGet('http://localhost:8000/advise/api/case/310363/vuls/')
        .reply(200, data['vuls'])
        mock.onGet('http://localhost:8000/advise/api/case/310363/components/')
        .reply(200, data['compstatus'])
        .onAny()
        .reply(200, []);

        const user = userEvent.setup();
        const { container } = render(
            <MemoryRouter initialEntries={["/advise/cases/310363"]}>
            <CaseApp />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByRole('tab', {name:/Status/})).toBeInTheDocument();
            user.click(screen.getByRole('tab', {name:/Status/}));
        });

        await waitFor(() => {
            /*add a new status */
            expect(screen.getByText(/dsftklsjdf/)).toBeInTheDocument();
            user.click(screen.getByText(/dsftklsjdf/));
        });

        await waitFor(() => {
            expect(screen.getByText(/CVE-1111-21127/)).toBeInTheDocument();
            
            const edit_btns = container.querySelectorAll(".edit-status-btn");
            expect(edit_btns).toHaveLength(3);
            user.click(edit_btns[0]);
        });
        /* Edit Status */
        await waitFor(() => {
            expect(screen.getByText(/Edit status for dsftklsjdf 1.3.2/i)).toBeInTheDocument();
            expect(screen.getByTestId("status-cancel")).toBeInTheDocument();
            user.click(screen.getByTestId("status-cancel"));
        });
        
        await waitForElementToBeRemoved(() => screen.getByText(/Edit status for dsftklsjdf 1.3.2/i))

        await waitFor(() => {
            expect(container.querySelector("#status-dropdown")).toBeInTheDocument()
            user.click(container.querySelector("#status-dropdown"));
        });
        
        await waitFor(() => {

            expect(screen.getByText(/Add Status/i)).toBeInTheDocument();
            expect(screen.getByText(/View All/)).toBeInTheDocument();
            user.click(screen.getByText(/Add Status/i));
        });

        mock.reset();
        await waitFor(() => {
            expect(screen.getByText(/Add Component status/i)).toBeInTheDocument();
            expect(screen.getByTestId("status-cancel")).toBeInTheDocument();
            user.click(screen.getByTestId("status-cancel"));
        });

        await waitForElementToBeRemoved(() => screen.getByText(/Add Component status/i));

        await waitFor(() => {
            user.click(screen.getByText(/dsftklsjdf/));
        });

        await waitFor(() => {
            expect(screen.getByText(/CVE-1111-21127/)).toBeInTheDocument();
            
            const edit_btns = container.querySelectorAll(".rm-status-btn");
            expect(edit_btns).toHaveLength(3);
            user.click(edit_btns[0]);
        });

        mock.onDelete("http://localhost:8000/advise/api/case/component/80/status/")
        .reply(200, [])
        mock.onGet('http://localhost:8000/advise/api/case/310363/components/')
        .reply(200, data['compstatus'])

        await waitFor(() => {
            /* wait for remove confirmation */
            expect(screen.getByText(/Confirm this action/i)).toBeInTheDocument();
            expect(screen.getByRole('button', {name:/delete/i})).toBeInTheDocument();
            user.click(screen.getByRole('button', {name:/delete/i}));
        });

        await waitForElementToBeRemoved(() => screen.getByText(/Confirm this action/i))

        await waitFor(() => {
            user.click(screen.getByText(/something 1.2.3/i));
            const view_btns = container.querySelectorAll(".view-status-btn");
            expect(view_btns).toHaveLength(3);
            user.click(view_btns[2]);
        })

        await waitFor(() => {
            expect(screen.getByText('Component Status Detail')).toBeInTheDocument();
            expect(screen.getByRole('tab', {name:"Detail"})).toBeInTheDocument();
            expect(screen.getByRole('tab', {name:/Activity/})).toBeInTheDocument();
            expect(screen.getByRole('tab', {name:/Vex/})).toBeInTheDocument();
            expect(screen.getByTestId("close-status-modal")).toBeInTheDocument();
            user.click(screen.getByTestId("close-status-modal"));
        })

        await waitForElementToBeRemoved(() => screen.getByText(/Component Status Detail/i))

            /*
        //this isn't working?
        await waitFor(() => {
            fireEvent.change(screen.getByLabelText('Component'), {
                target: 
                {value: 'Component xyz'}
            });
            //fireEvent.click(screen.getByLabelText('CVE-9999-1111'));
            //user.click(screen.getByLabelText('Affected'));
            fireEvent.change(screen.getByLabelText(/Affected version/i), {
                target: 
                {value: '1.2.3'}
            });
            user.click(screen.getByTestId('submit-status'));
        });

        await waitForElementToBeRemoved(() => screen.getByText(/Add Component status/i));

        await waitFor(() => {
            expect(screen.getByText(/Component xyz 1.2.3/)).toBeInTheDocument();

        })*/


    }, 10000);


    it("should render case status table", async () => {
        
        mock.onGet("http://localhost:8000/advise/api/cases/310363/").reply(
            200,
            data['case']
        );
        mock.onGet(
            "http://localhost:8000/advise/api/case/310363/participants/?role=owner"
        ).reply(200, data['owners']);
        
        mock.onGet("http://localhost:8000/advise/api/case/310363/user/")
            .reply(200, data['usercasestate'])


        mock.onGet("http://localhost:8000/advise/api/case/310363/threads/")
        .reply(200, data['threads'])

        mock.onGet("http://localhost:8000/advise/api/case/thread/149/posts/")
        .reply(200, data['posts'])
        mock.onGet('http://localhost:8000/advise/api/case/thread/149/participants/')
        .reply(200, data['caseparticipants'])
        mock.onGet('http://localhost:8000/advise/api/case/310363/vuls/')
        .reply(200, data['vuls'])
        mock.onGet('http://localhost:8000/advise/api/case/310363/components/')
        .reply(200, data['compstatus'])
        .onAny()
        .reply(200, []);

        const user = userEvent.setup();
        const { container } = render(
            <MemoryRouter initialEntries={["/advise/cases/310363"]}>
            <CaseApp />
            </MemoryRouter>
        );


        await waitFor(() => {
            expect(screen.getByRole('tab', {name:/Status/})).toBeInTheDocument();
            user.click(screen.getByRole('tab', {name:/Status/}));
        });

        await waitFor(() => {
            expect(screen.getByText(/dsftklsjdf/)).toBeInTheDocument();
            expect(container.querySelector("#status-dropdown")).toBeInTheDocument()
            user.click(container.querySelector("#status-dropdown"));
        });
        
        await waitFor(() => {

            expect(screen.getByText(/Add Status/i)).toBeInTheDocument();
            expect(screen.getByText(/View All/)).toBeInTheDocument();
            user.click(screen.getByText(/View All/i));
        });

        await waitFor(() => {
            expect(screen.getByPlaceholderText("Search Components")).toBeInTheDocument();
            expect(screen.getByText(/dsftklsjdf/)).toBeInTheDocument();
            user.click(screen.getByText(/dsftklsjdf/))

        })

        await waitFor(() => {
            expect(screen.getByText(/Statement/)).toBeInTheDocument();
            const view_btns = container.querySelectorAll(".edit-status-btn");
            expect(view_btns).toHaveLength(3);
            user.click(view_btns[2]);
        })
        await waitFor(() => {
            expect(screen.getByText(/Edit Component Status/)).toBeInTheDocument();
            expect(screen.getByRole("button", {name:/Cancel/i})).toBeInTheDocument();
            user.click(screen.getByRole("button", {name:/Cancel/i}));
        });

        await waitForElementToBeRemoved(() => screen.getByText(/Edit Component Status/));

        await waitFor(() => {

            const view_btns = container.querySelectorAll(".view-status-btn");
            expect(view_btns).toHaveLength(3);
            user.click(view_btns[2]);
        })
        
        await waitFor(() => {
            expect(screen.getByText(/Component Status Detail/)).toBeInTheDocument();
            expect(screen.getByTestId('close-status-modal')).toBeInTheDocument();
            user.click(screen.getByTestId('close-status-modal'));
        });

        await waitForElementToBeRemoved(() => screen.getByText(/Component Status Detail/));


        await waitFor(() => {

            const view_btns = container.querySelectorAll(".rm-status-btn");
            expect(view_btns).toHaveLength(3);
            user.click(view_btns[2]);
        })

        await waitFor(() => {
            expect(screen.getByText(/Confirm this action/i)).toBeInTheDocument();
            expect(screen.getByRole("button", {name:/Delete/i})).toBeInTheDocument();
            user.click(screen.getByRole("button", {name:/Delete/i}));
        });

        await waitForElementToBeRemoved(() => screen.getByText(/Confirm this action/));

        /* test search */

        await waitFor(() => {
            expect(screen.getByText('dsftklsjdf')).toBeInTheDocument();
            fireEvent.change(screen.getByPlaceholderText('Search Components'), {
                target: 
                {value: 'lib'}
            });
        })
        /* live search should return non-matches */
        await waitFor(() => {
            expect(screen.getByText('libx')).toBeInTheDocument();
            //I wish not worked
            //expect(screen.getByText('dsftklsjdf')).not.toBeInTheDocument();
        })

    });
    it("should render err if permission denied", async () => {
        
        mock.onGet("http://localhost:8000/advise/api/cases/310363/").reply(
            403,
            new Error("Forbidden")
        );

        const { container } = render(
            <MemoryRouter initialEntries={["/advise/cases/310363/status"]}>
            <CaseApp />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText("Unauthorized")).toBeInTheDocument();
            expect(mock.history.get.length).toBe(1);
        });

    });

     

});
