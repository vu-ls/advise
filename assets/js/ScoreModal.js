import React from 'react'
import { useState, useEffect} from 'react';
import { Modal,Tab, Tabs, Alert, Form, Button } from "react-bootstrap";
import ThreadAPI from './ThreadAPI';
import SSVCScore from './SSVCScore';

const threadapi = new ThreadAPI();


const CVSSVersionIdentifier = "CVSS:3.1";
const exploitabilityCoefficient = 8.22;
const scopeCoefficient = 1.08;

const weight = {
    AV:   { N: 0.85,  A: 0.62,  L: 0.55,  P: 0.2},
    AC:   { H: 0.44,  L: 0.77},
    PR:   { U:       {N: 0.85,  L: 0.62,  H: 0.27},         // These values are used if Scope is Unchanged
            C:       {N: 0.85,  L: 0.68,  H: 0.5}},         // These values are used if Scope is Changed
    UI:   { N: 0.85,  R: 0.62},
    S:    { U: 6.42,  C: 7.52},                             // Note: not defined as constants in specification
    C:    { N: 0,     L: 0.22,  H: 0.56},                   // C, I and A have the same weights
    I:    { N: 0,     L: 0.22,  H: 0.56},                   // C, I and A have the same weights
    A:    { N: 0,     L: 0.22,  H: 0.56},                   // C, I and A have the same weights
};


// Severity rating bands, as defined in the CVSS v3.1 specification.

const severityRatings  = [ { name: "None",     bottom: 0.0, top:  0.0},
                           { name: "Low",      bottom: 0.1, top:  3.9},
                           { name: "Medium",   bottom: 4.0, top:  6.9},
                           { name: "High",     bottom: 7.0, top:  8.9},
                           { name: "Critical", bottom: 9.0, top: 10.0} ];


const ScoreModal = ({ showModal, hideModal, vul }) => {

    const [showDeleteButton, setShowDeleteButton] = useState(true);
    const [accountID, setAccountID] = useState("");
    const [apiError, setApiError] = useState(false);
    const [message, setMessage ] = useState([]);
    const [formContent, setFormContent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [edit, setEdit] = useState(null);


    const createVectorScore = (selected) => {
	let score = 'CVSS:3.1/AV:';
        score += selected['AV'] ? selected['AV'] : '_';
        score += "/AC:" + (selected['AC'] ? selected['AC'] : '_');
        score += "/PR:" + (selected['PR'] ? selected['PR'] : '_');
        score += "/UI:" + (selected['UI'] ? selected['UI'] : '_');
        score += "/S:" + (selected['S'] ? selected['S'] : '_');
        score += "/C:" + (selected['C'] ? selected['C'] : '_');
        score += "/I:" + (selected['I'] ? selected['I'] : '_');
        score += "/A:" + (selected['A'] ? selected['A'] : '_');
        return score;
    };

    const getSeverityRating = (score) => {
	let i;
        let severityRatingLength = severityRatings.length;
        for (i = 0; i < severityRatingLength; i++) {
            if (score >= severityRatings[i].bottom && score <= severityRatings[i].top) {
                return severityRatings[i].name;
            }
        }
        return {
            name: "?",
        };
    };


    const calculateScore = (selected) => {
	let metricWeight = {};
        Object.keys(weight).forEach((key) => {
            if (selected[key] && key === 'PR') {
                if (selected.S) {
                    metricWeight[key] = weight[key][selected.S][selected[key]];
                } else {
                    metricWeight[key] = 0;
                }
            } else if (selected[key]) {
                metricWeight[key] = weight[key][selected[key]];
            } else {
                metricWeight[key] = 0;
            }
        });
	console.log(metricWeight);

	let roundUpScore = function Roundup(input) {
            let int_input = Math.round(input * 100000);
            if (int_input % 10000 === 0) {
                return int_input / 100000
            } else {
                return (Math.floor(int_input / 10000) + 1) / 10
            }
        };
        try {
            let baseScore, impactSubScore;
            let impactSubScoreMultiplier = (1 - ((1 - metricWeight.C) * (1 - metricWeight.I) * (1 - metricWeight.A)));
	    console.log(impactSubScoreMultiplier);
            if (selected.S === 'U') {
                impactSubScore = metricWeight.S * impactSubScoreMultiplier;
            } else {
                impactSubScore = metricWeight.S * (impactSubScoreMultiplier - 0.029) - 3.25 * Math.pow(impactSubScoreMultiplier - 0.02, 15);
            }
	    console.log(impactSubScoreMultiplier);
            let exploitabilitySubScore = exploitabilityCoefficient * metricWeight.AV * metricWeight.AC * metricWeight.PR * metricWeight.UI;
	    console.log(exploitabilitySubScore);
            if (impactSubScore <= 0) {
                baseScore = 0;
            } else {
                if (selected.S === 'U') {
                    baseScore = roundUpScore(Math.min((exploitabilitySubScore + impactSubScore), 10));
                } else {
                    baseScore = roundUpScore(Math.min((exploitabilitySubScore + impactSubScore) * scopeCoefficient, 10));
                }
            }
            return baseScore.toFixed(1);
        } catch (err) {
            return err;
        }
    }
    
    
    
    const testSubmit = async () => {

	event.preventDefault();
        const formData = new FormData(event.target),
              formDataObj = Object.fromEntries(formData.entries());
        console.log(formDataObj);
	// are all fields selected?
	if (Object.keys(formDataObj).length != 11) {
	    setError("All fields are required.  Check all metrics and try again");
	    return;
	}
	
	let vector = createVectorScore(formDataObj);
	let score = calculateScore(formDataObj);
	let severity = getSeverityRating(score);
	console.log(vector);
	formDataObj["vector"] = vector;
	formDataObj["score"] = score;
	formDataObj["severity"] = severity;
	console.log(formDataObj);
        try {
            if (vul.cvss_vector) {
                threadapi.updateCVSSScore(vul, formDataObj).then((response) => {
                    hideModal();
                })
            } else {
		console.log("IN ADD");
		threadapi.addCVSSScore(vul, formDataObj).then((response) => {
                    hideModal();
		})
            }
	} catch (err) {
            console.log(err);
        }



    }

    const removeScore = () => {
	try {
            threadapi.removeCVSSScore(vul).then((response) => {
                hideModal();
                })
	} catch (err) {
	    setError("Error removing CVSS score.  Try again later.");
	}
    }

    
    // Async Fetch
    const fetchInitialData = async () => {
	console.log("fetching form");
        try {
	    /*
            if (edit) {
                await threadapi.getCVSSForm(edit).then((response) => {
                    setFormContent(response);
                })
		} else {
	    */
            await threadapi.getCVSSForm(vul).then((response) => {
                setFormContent(response);
                setLoading(false);
            })
        } catch (err) {
	    if (err.response.status == 403) {
		setError(`You are not permitted to score this vulnerability.`);
	    } else {
		setError(`Error fetching CVSS form: ${err.message}`);
	    }
	    setLoading(false);
	    console.log('Error:', err)
        }
    }

    useEffect(() => {
	console.log("VUL IS", vul);
	if (vul) {
            fetchInitialData();
	}
    }, [vul]);

    return (
        <Modal show={showModal} onHide={hideModal} size="lg" centered backdrop="static">
        <Modal.Header closeButton>
            <Modal.Title>Score the vulnerability</Modal.Title>
        </Modal.Header>
            <Modal.Body>
		<Tabs
		    defaultActiveKey="cvss"
		    id="scoringtabs"
		    className="mb-3"
		    fill
		>
		    <Tab eventKey="cvss" title="CVSS">
			{error &&
			 <div className="alert alert-danger">{error}</div>
			}

			{formContent ?
			 <form onSubmit={(e)=>testSubmit(e)}>

			     <div dangerouslySetInnerHTML={{__html: formContent}} />
			     <div className="d-flex justify-content-between">
				 {vul.cvss_vector ?

				 <Button variant="danger" onClick={(e)=>removeScore(e)}>
				     Delete Score
				 </Button>
				  :
				  <div></div>
				 }
				
				 <div>
				     <div className="d-flex justify-content-end gap-2">
					 <Button variant="secondary" onClick={hideModal}>
					     Cancel
					 </Button>
					 <Button variant="primary" type="submit" data-testid="score-submit">
					 Submit</Button>
				     </div>
				 </div>
			     </div>
			 </form>
			 :
			 <>
			     {loading &&
			      <div className="text-center">
				  <div className="lds-spinner"><div></div><div></div><div></div></div>
                              </div>
			     }
			 </>
			}


		    </Tab>
		    <Tab eventKey="ssvc" title="SSVC">
			<SSVCScore
			    vul={vul}
			    hideModal = {hideModal}
			/>
		    </Tab>

		</Tabs>

	    </Modal.Body>
	</Modal>
    )
}

export default ScoreModal;
