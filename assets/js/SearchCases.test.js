import React from "react";
import { MemoryRouter } from "react-router-dom";
import MockAdapter from "axios-mock-adapter";
import {
  render,
  fireEvent,
  waitFor,
  screen,
} from "@testing-library/react";

import SearchCases from "./SearchCases";
import axios from "axios";
import { cleanup } from "@testing-library/react";

const mock = new MockAdapter(axios, { onNoMatch: "throwException" });


let mockcaseresults = {
    count: 1,
    results:  [
        {   
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
			  question:
                          "What is the name of the affect product or software?",
                      },
                  ],
            },
            public_date: null,
            due_date: "2023-09-23T14:02:01.156086Z",
            advisory_status: "PENDING",
        },
    ],
};

describe("Search Cases Component", () => {
    let mockOwnerElement;
    let mockStatusElement;

    afterEach(() => {
        cleanup;
        mock.reset();
        mock.resetHistory();
          });
    
      beforeEach(() => {
        jest.clearAllMocks();
      });
    

    beforeEach(() => {
        jest.clearAllMocks();
        mockOwnerElement = document.createElement("script")
        mockOwnerElement.setAttribute("id", "owner_option");
        mockOwnerElement.innerHTML = "";
        mockStatusElement = document.createElement("script");
        mockStatusElement.setAttribute("id", "case_status_options");
        /*JSON.parse = jest.fn().mockImplementationOnce(() => {
            return [{"id": 0, "name": "Pending"}, {"id": 1, "name": "Active"}, {"id": 2, "name": "Inactive"}];
            // return your what your code is returning.
        }).mockImplementationOnce(() => {
            return [];
        })*/
        
        mockStatusElement.textContent = JSON.stringify([{"id": 0, "name": "Pending"}, {"id": 1, "name": "Active"}, {"id": 2, "name": "Inactive"}]);
        mockOwnerElement.textContent = JSON.stringify([]);
        document.body.appendChild(mockOwnerElement);
        document.body.appendChild(mockStatusElement);
        
    });
    

    it("should show loading dots while loading", async () => {

        mock.onGet("http://localhost:8000/advise/api/cases/?page=1").reply(200, mockcaseresults);
	const { container } = render(
	    <MemoryRouter>
		<SearchCases />
	    </MemoryRouter>
	);
	await waitFor(() => {
	    expect(screen.queryAllByRole("checkbox").length).toBe(3);
	    expect(container.getElementsByClassName("lds-spinner").length).toBe(1);
        expect(mock.history.get.length).toBe(1);

	});

    });

    it("should show data when loaded", async () => {

        mock.onGet("http://localhost:8000/advise/api/cases/?page=1").reply(200, mockcaseresults);    
	render(
	    <MemoryRouter>
                <SearchCases />
	    </MemoryRouter>
        );

	await waitFor(() => {

	    expect(screen.getByText(/CASE#312650/i)).toBeInTheDocument();
        expect(mock.history.get.length).toBe(1);
	});

    });

    it("should show no data when search returns nothing", async () => {

        mock.onGet("http://localhost:8000/advise/api/cases/?page=1").reply(200, mockcaseresults).onGet("http://localhost:8000/advise/api/cases/?search=something").reply(200, []);

	render(

            <MemoryRouter>
                <SearchCases />
            </MemoryRouter>
        );

	await waitFor(() => {
	    const inputNode = screen.getByPlaceholderText("Search Cases");
	    fireEvent.change(inputNode, { target: { value: "something" } });
	    console.log("inputNode.value", inputNode.value);
	    expect(screen.getByText(/You have no cases/)).toBeInTheDocument();
        expect(mock.history.get.length).toBe(2);
	});

    });

    it("should show error if API is down", async () => {
        
    
        mock.onGet("http://localhost:8000/advise/api/cases/?page=1").reply(500, new Error("API IS BROKE"));
    
        render(
            <MemoryRouter>
                <SearchCases />
            </MemoryRouter>
        );

        await waitFor(() => {

	    expect(screen.getByRole("alert")).toBeInTheDocument();
        expect(mock.history.get.length).toBe(1);
        });
    });

    it("should show error if API is down and search happens", async () => {

        mock.onGet("http://localhost:8000/advise/api/cases/?page=1").reply(200, mockcaseresults).onAny().reply(500, new Error("BROKEN"));
        render(
            <MemoryRouter>
                <SearchCases />
            </MemoryRouter>
        );

	await waitFor(() => {
        const inputNode = screen.getByPlaceholderText("Search Cases");
        fireEvent.change(inputNode, { target: { value: "Airpods" } });
        console.log("inputNode.value", inputNode.value);
        expect(screen.getByRole("alert")).toBeInTheDocument();
        expect(mock.history.get.length).toBe(2);
        });
    });

    it("should show data when search returns something", async () => {

        mock.onGet("http://localhost:8000/advise/api/cases/?page=1").reply(200, mockcaseresults)
        .onGet("http://localhost:8000/advise/api/cases/?search=Airpods").reply(200, mockcaseresults)
        .onGet("http://localhost:8000/advise/api/cases/?search=Airpods&status=2").reply(200, [])
        .onAny().reply(200, mockcaseresults)

         const { container } = render(
            <MemoryRouter>
                <SearchCases />
            </MemoryRouter>
         );


	await waitFor(() => {


            const inputNode = screen.getByPlaceholderText("Search Cases");
            fireEvent.change(inputNode, { target: { value: "Airpods" } });
            console.log("inputNode.value", inputNode.value);
	    expect(container.getElementsByClassName("lds-spinner").length).toBe(1);

	});

	await waitFor(() => {

            expect(screen.getByText(/CASE#312650/i)).toBeInTheDocument();
        });

	await waitFor(() => {
	    const checkbox = screen.getByTestId('check-Inactive')
	    fireEvent.click(checkbox);
	    expect(container.getElementsByClassName("lds-spinner").length).toBe(1);
	});

	await waitFor(() => {

	    expect(screen.getByText(/You have no cases/)).toBeInTheDocument();
	});

	await waitFor(() => {
            const checkbox = screen.getByTestId('check-Active')
            fireEvent.click(checkbox);
            expect(container.getElementsByClassName("lds-spinner").length).toBe(1);
        });

	await waitFor(() => {

            expect(screen.getByText(/CASE#312650/)).toBeInTheDocument();
            expect(mock.history.get.length).toBe(4);
	});

    });
});
