import React from "react";
import CaseApp from "./CaseApp";
import MockAdapter from "axios-mock-adapter";
import { render, waitFor, screen } from "@testing-library/react";

import { MemoryRouter } from "react-router-dom";
import { createMemoryHistory } from "history";
import axios from "axios";
import { cleanup } from "@testing-library/react";

const mock = new MockAdapter(axios, { onNoMatch: "throwException" });

const mockcasejson = {
    case_id: "312650",
    case_identifier: "CASE#312650",
    owners: [
        {
            id: 1,
            name: "emily",
            org: "",
            photo: "/media/user_logos/54b2bf17-10a1-45aa-91c4-d37bab92f661/vu.ls.png",
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
    results: [mockcasejson],
};

describe("Case App", () => {
    beforeAll(() => {
        mock.reset();
    });

    afterEach(() => {
        cleanup;
        mock.reset();
        mock.resetHistory();
    });

    it("should render search cases by default", async () => {
        //SearchCases calls searchcaseresults & getCasesByPage
        const history = createMemoryHistory({
            initialEntries: ["/advise/cases"],
        });
        history.push = jest.fn();

        let mockOwnerElement = document.createElement("script");
        mockOwnerElement.setAttribute("id", "owner_option");
        mockOwnerElement.innerHTML = "";
        let mockStatusElement = document.createElement("script");
        mockStatusElement.setAttribute("id", "case_status_options");

        mockStatusElement.textContent = JSON.stringify([
            { id: 0, name: "Pending" },
            { id: 1, name: "Active" },
            { id: 2, name: "Inactive" },
        ]);
        mockOwnerElement.textContent = JSON.stringify([]);
        document.body.appendChild(mockOwnerElement);
        document.body.appendChild(mockStatusElement);

        //const mockGet = jest.spyOn(axios, 'get')
        //axios.get.mockResolvedValue(mockcaseresults);
        //mockGet.mockImplementationOnce(() => Promise.resolve({data: mockcaseresults}));
        //mockedAxios.get.mockResolvedValueOnce(mockcaseresults);

        mock.onGet("http://localhost:8000/advise/api/cases/?page=1").reply(
            200,
            mockcaseresults
        );

        render(
            <MemoryRouter
                initialEntries={["/advise/cases", "/advise/cases/:id"]}
                initialIndex={0}
            >
                <CaseApp />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(mock.history.get.length).toBe(1);
            //expect(mock).toHaveBeenCalledTimes(1);
            expect(screen.queryAllByRole("checkbox").length).toBe(3);
            expect(screen.getByText(/CASE#312650/i)).toBeInTheDocument();
        });

        //mockGet.mockClear();
    });

    it("should render case if url contains case id", async () => {
        // mock get status transfers

        //const mockGet = jest.spyOn(axios, 'get')
        //mockGet.mockImplementationOnce(() => Promise.resolve({ data: mockcasejson })).mockImplementation(() => Promise.resolve({data: []}));

        mock.onGet("http://localhost:8000/advise/api/cases/312650/").reply(
            200,
            mockcasejson
        );
        mock.onGet(
            "http://localhost:8000/advise/api/case/312650/participants/?role=owner"
        ).reply(200, [
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
                    "participant",
                ],
                users: [],
            },
        ]);
        mock.onGet("http://localhost:8000/advise/api/case/312650/user/")
            .reply(200, {
                user: {
                    id: 1,
                    name: "emily",
                    org: "",
                    photo: "http://localhost:8000/media/user_logos/54b2bf17-10a1-45aa-91c4-d37bab92f661/vu.ls.png",
                    logocolor: "#7FF3AE",
                    title: "",
                    contact: "54b2bf17-10a1-45aa-91c4-d37bab92f661",
                },
                contact: "54b2bf17-10a1-45aa-91c4-d37bab92f661",
                last_viewed: "2023-09-13T14:20:36.175439Z",
                delete_perm: true,
                role: "owner",
                status_needed: false,
            })
            .onAny()
            .reply(200, []);

        //axios.get.mockResolvedValueOnce(casejson);

        render(
            <MemoryRouter initialEntries={["/advise/cases/312650"]}>
                <CaseApp />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText("Original Report")).toBeInTheDocument();
            expect(screen.getByText(/CASE#312650/i)).toBeInTheDocument();
            expect(mock.history.get.length).toBe(10);
        });
    });

    it("should render err if url contains non existent case id", async () => {
        /*let rep = nock("http://localhost:8000/advise")
            .get("/api/cases/123456/")
            .once()
            .reply(404, new Error("not found"))*/
        mock.onGet("http://localhost:8000/advise/api/cases/123456/").reply(
            404,
            new Error("not found")
        );

        render(
            <MemoryRouter initialEntries={["/advise/cases/123456"]}>
                <CaseApp />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText("Unauthorized")).toBeInTheDocument();
            expect(mock.history.get.length).toBe(1);
        });
    });

    it("should render status table if url contains staus", async () => {
        mock.onGet("http://localhost:8000/advise/api/cases/312650/").reply(
            200,
            mockcasejson
        );
        mock.onGet("http://localhost:8000/advise/api/cases/312650/status/")
            .reply(200, [])
            .onAny()
            .reply(200, []);

        render(
            <MemoryRouter initialEntries={["/advise/cases/312650/status"]}>
                <CaseApp />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText("Status")).toBeInTheDocument();
            expect(
                screen.getByPlaceholderText("Search Components")
            ).toBeInTheDocument();
            expect(mock.history.get.length).toBe(2);
        });
    });

    it("should render err if permission denied", async () => {
        mock.onGet("http://localhost:8000/advise/api/cases/123456/").reply(
            403,
            new Error("Forbidden")
        );
        render(
            <MemoryRouter initialEntries={["/advise/cases/123456"]}>
                <CaseApp />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText("Unauthorized")).toBeInTheDocument();
            expect(mock.history.get.length).toBe(1);
        });
    });

    it("should render err if permission denied on case status", async () => {
        mock.onGet("http://localhost:8000/advise/api/cases/123456/").reply(
            403,
            new Error("Permission Denied")
        );

        render(
            <MemoryRouter initialEntries={["/advise/cases/123456/status"]}>
                <CaseApp />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText("Unauthorized")).toBeInTheDocument();
            expect(mock.history.get.length).toBe(1);
        });
    });
});
