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
/* mock calendar download */
const link = {
    click: jest.fn()
};
//jest.spyOn(document, "createElement").mockImplementation(() => link);
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

    it("should render status and allow for change of status and owner", async () => {

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
            expect(screen.getByText(/Active/i)).toBeInTheDocument();
            expect(screen.getByText(/Assigned to/i)).toBeInTheDocument();
            expect(screen.getByRole('button', {name:/emily/i})).toBeInTheDocument();
            expect(screen.getByText(/Not public/i)).toBeInTheDocument();
            user.click(screen.getByText(/Active/i));
        })

        mock.reset();
        mock.onPatch('http://localhost:8000/advise/api/cases/310363/')
        .reply(200, []);
        let revised_case = data['case']
        revised_case['status'] = "Pending"
        mock.onGet("http://localhost:8000/advise/api/cases/310363/").reply(
            200,
            revised_case
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

        await waitFor(() => {
            /* allow user to change status */
            expect(screen.getByText(/Pending/i)).toBeInTheDocument();
            expect(screen.getByText(/Inactive/i)).toBeInTheDocument();
            user.click(screen.getByText(/Pending/i));
        });

        await waitFor(() => {
            expect(screen.getByText(/Pending/i)).toBeInTheDocument();
            expect(mock.history.patch.length).toBe(1);
            
        })
    });
        

    it("should allow change of owner", async () => {

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
            expect(screen.getByRole('button', {name:/emily/i})).toBeInTheDocument();
        });            
            
        mock.reset();
        mock.resetHistory();
        mock.onPost("http://localhost:8000/advise/api/case/310363/assign/")
        .reply(200, []);
        mock.onGet("http://localhost:8000/advise/api/cases/310363/").reply(
            200,
            data['unassigned_case']
        )        
        
        mock.onGet(
            "http://localhost:8000/advise/api/case/310363/participants/?role=owner"
        ).reply(200, []);
        mock.onGet("http://localhost:8000/advise/api/case/310363/user/")
        .reply(200, data['usercasestate'])
        mock.onGet("http://localhost:8000/advise/api/case/310363/threads/")
        .reply(200, data['threads'])

        mock.onGet("http://localhost:8000/advise/api/case/thread/149/posts/")
        .reply(200, data['posts'])
        mock.onGet('http://localhost:8000/advise/api/case/thread/149/participants/')
        .reply(200, [])
        .onAny()
        .reply(200, []);
        
        await waitFor(() => {
            user.click(screen.getByRole('button', {name:/emily/i}));
        })

        await waitFor(() => {
            expect(screen.getByText('Unassign')).toBeInTheDocument();
            expect(screen.getByText('Auto Assign')).toBeInTheDocument();
            expect(screen.getByPlaceholderText(/Type to filter/i)).toBeInTheDocument();
            user.click(screen.getByText('Unassign'));
        })

        await waitFor(() => {
            expect(screen.getByText(/This case is currently unassigned/)).toBeInTheDocument();
            expect(mock.history.post.length).toBe(1);
        })

    });


    it("should allow case status functions", async () => {

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
   
        delete window.location;
        window.location = {
            href: "",
        };
        
        const user = userEvent.setup();
        const { container } = render(
            <MemoryRouter initialEntries={["/advise/cases/310363"]}>
            <CaseApp />
            </MemoryRouter>
        );
    
        await waitFor(() => {
            expect(container.querySelector("#case-status-dropdown")).toBeInTheDocument()
            user.click(container.querySelector("#case-status-dropdown"));
        });

        await waitFor(() => {
            expect(screen.getByText(/Edit Details/i)).toBeInTheDocument();
            expect(screen.getByText(/Edit Advisory/i)).toBeInTheDocument();
            expect(screen.getByText(/Transfer Case/i)).toBeInTheDocument();
            expect(screen.getByRole('link', { name: 'Edit Details' })).toHaveAttribute('href', '310363/edit/')
            expect(screen.getByRole('link', { name: 'Edit Advisory' })).toHaveAttribute('href', '310363/advisory/')
            user.click(screen.getByText(/Transfer Case/i));
        });

        await waitFor(() => {
            expect(screen.getAllByText(/Transfer Case/)).toHaveLength(2);
            expect(screen.getByText(/Oops!/)).toBeInTheDocument();
            expect(screen.getByTestId("cancel-transfer-modal")).toBeInTheDocument();
            user.click(screen.getByTestId("cancel-transfer-modal"));
        })

        /* mock calendar download */
        
        await waitFor(() => {
            expect(screen.getAllByText(/Transfer Case/)).toHaveLength(1);
            expect(screen.getByTestId('calendar-download')).toBeInTheDocument();
        })

                
    });

    it("should do advisory things", async () => {
        let case_with_advisory = data['case']
        case_with_advisory['advisory_status'] = "DRAFT"
        mock.onGet("http://localhost:8000/advise/api/cases/310363/").reply(
            200,
            case_with_advisory
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
            expect(screen.getByText(/Draft/i)).toBeInTheDocument()
        });


    });

});
