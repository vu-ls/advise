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
document.createRange = () => {
    const range = new Range();
  
    range.getBoundingClientRect = () => {
        return {
          x: 0,
          y: 0,
          bottom: 0,
          height: 0,
          left: 0,
          right: 0,
          top: 0,
          width: 0,
          toJSON: () => {}
        };
      };
  
    range.getClientRects = () => {
      return {
        item: () => null,
        length: 0,
        [Symbol.iterator]: jest.fn()
      };
    };
  
    return range;
  }

/* most aspects of this component are tested in CaseThreadApp.test.js but
a few tests need to have the ability to dynamically change mocked return values
in order to make sure the app responds properly */

describe("Post Component", () => {

    afterEach(() => {
        cleanup;
        mock.reset();
        mock.resetHistory();
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("should pin/unpin post", async () => {

        mock.onGet("http://localhost:8000/advise/api/cases/312650/").reply(
            200,
            data['case']
        );
        mock.onGet(
            "http://localhost:8000/advise/api/case/312650/participants/?role=owner"
        ).reply(200, data['owners']);
        
        mock.onGet("http://localhost:8000/advise/api/case/312650/user/")
            .reply(200, data['usercasestate'])


        mock.onGet("http://localhost:8000/advise/api/case/312650/threads/")
        .reply(200, data['threads'])

        mock.onGet("http://localhost:8000/advise/api/case/thread/149/posts/")
        .reply(200, data['posts'])
        mock.onGet('http://localhost:8000/advise/api/case/thread/149/participants/')
        .reply(200, data['caseparticipants'])
        .onAny()
        .reply(200, []);

        
        const user = userEvent.setup();

        const { container } = render(
            <MemoryRouter initialEntries={["/advise/cases/312650"]}>
            <CaseApp />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByRole('tab', {name: /Official Case Thread/})).toBeInTheDocument();
            expect(screen.getByRole('tab', {name: /Add a Thread/})).toBeInTheDocument();
            expect(container.querySelector(".ql-editor")).toBeInTheDocument();
        })

        await waitFor(() => {
            /* I don't know why, but this takes longer to render */
            const postedit = container.getElementsByClassName('postactions');
            user.click(postedit[0]);
        });
        
        /* reset because we don't want to just return [] on pinned posts */
        mock.reset();
        mock.resetHistory();
        let pinnedposts = data['posts'];
        pinnedposts['results'][0]['pinned'] = true

        mock.onPatch("http://localhost:8000/advise/api/case/thread/post/218/")
        .reply(200, []);
        mock.onGet("http://localhost:8000/advise/api/case/thread/149/posts/?pinned=1")
        .reply(200, pinnedposts);
        mock.onGet("http://localhost:8000/advise/api/case/thread/149/posts/")
        .reply(200, [])

        await waitFor(() => {
            expect(screen.getByText(/Pin Post/i)).toBeInTheDocument();
            user.click(screen.getByText(/Pin Post/i));
        })

        await waitFor(() => {
            expect(mock.history.get.length).toBe(2);
            expect(mock.history.patch.length).toBe(1);
        });

        /* now unpin it */

        mock.reset();
        mock.resetHistory();

        await waitFor(() => {
            expect(screen.getByText(/Pinned Post/i)).toBeInTheDocument();
            const postedit = container.getElementsByClassName('postactions');
            user.click(postedit[0]);
        })

        mock.onPatch("http://localhost:8000/advise/api/case/thread/post/218/")
        .reply(200, []);
        mock.onGet("http://localhost:8000/advise/api/case/thread/149/posts/?pinned=1")
        .reply(200, []);
        mock.onGet("http://localhost:8000/advise/api/case/thread/149/posts/")
        .reply(200, data['posts'])

        await waitFor(() => {
            expect(screen.getByText(/Pin Post/i)).toBeInTheDocument();
            user.click(screen.getByText(/Pin Post/i));
        })

        await waitForElementToBeRemoved(() => screen.getByText(/Pinned Post/i));

    });

    it("should edit post and show edits if available", async () => {
        mock.onGet("http://localhost:8000/advise/api/cases/312650/").reply(
            200,
            data['case']
        );
        mock.onGet(
            "http://localhost:8000/advise/api/case/312650/participants/?role=owner"
        ).reply(200, data['owners']);
        
        mock.onGet("http://localhost:8000/advise/api/case/312650/user/")
            .reply(200, data['usercasestate'])

        mock.onGet("http://localhost:8000/advise/api/case/312650/threads/")
        .reply(200, data['threads'])

        mock.onGet("http://localhost:8000/advise/api/case/thread/149/posts/")
        .reply(200, data['posts'])
        mock.onGet('http://localhost:8000/advise/api/case/thread/149/participants/')
        .reply(200, data['caseparticipants'])
        .onAny()
        .reply(200, []);

        const user = userEvent.setup();

        const { container } = render(
            <MemoryRouter initialEntries={["/advise/cases/312650"]}>
            <CaseApp />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByRole('tab', {name: /Official Case Thread/})).toBeInTheDocument();
            expect(screen.getByRole('tab', {name: /Add a Thread/})).toBeInTheDocument();
            expect(container.querySelector(".ql-editor")).toBeInTheDocument();
        })

        await waitFor(() => {
            const postedit = container.getElementsByClassName('postactions');
            user.click(postedit[0]);
        })

        mock.reset();
        mock.resetHistory();

        mock.onPatch("http://localhost:8000/advise/api/case/thread/post/218/")
        .reply(200, []);
        mock.onGet("http://localhost:8000/advise/api/case/thread/post/218/")
        .reply(200, data['editpost']);

        await waitFor(() => {
            expect(screen.getByText(/Edit Post/i)).toBeInTheDocument();
            user.click(screen.getByText(/Edit Post/i));
        })

        await waitFor(() => {
            /* now there should be 2 editors! */
            const editors =  container.getElementsByClassName('ql-editor')

            expect(editors).toHaveLength(2);
            /* Hello, World should still be there */
            expect(screen.getByText(/Hello, world/)).toBeInTheDocument();
            
            const submitbtns = screen.getAllByTestId('submit-post');
            expect(submitbtns).toHaveLength(2);
        
            fireEvent.change(editors[0], {
                target: { textContent: "Boooyah!" }
            });

        })

        await waitFor(() => {
            /* what I just typed is here */
            expect(screen.getByText(/Boooyah/)).toBeInTheDocument();
            const submitbtns = screen.getAllByTestId('submit-post');
            expect(submitbtns).toHaveLength(2);
            user.click(submitbtns[0]);

        });

        await waitFor(() => {
            expect(screen.getByText(/Boooyah/)).toBeInTheDocument();
            expect(screen.getByText(/edit/)).toBeInTheDocument();
            const submitbtns = screen.getAllByTestId('submit-post');
            expect(submitbtns).toHaveLength(1);

        })

        await waitFor(() => {
            expect(mock.history.get.length).toBe(1);
            expect(mock.history.patch.length).toBe(1);
        })

        /* now let's click the revision modal */
        

        await waitFor(() => {
            const edit_modal =  container.getElementsByClassName('show-diff')
            expect(edit_modal).toHaveLength(1);
            user.click(edit_modal[0]);
        })

        await waitFor(() => {
            expect(screen.getByText('Post Edits History')).toBeInTheDocument();
            expect(screen.getByText(/Hello, world/)).toBeInTheDocument();
            /* now close the modal */
            expect(screen.getByRole('button', {name:/Ok/})).toBeInTheDocument();
            user.click(screen.getByRole('button', {name:/Ok/}));
        });

        await waitForElementToBeRemoved(() => screen.getByText('Post Edits History'));

    });


});