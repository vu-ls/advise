import React from 'react';
import { Modal, OverlayTrigger, Popover, Alert, Badge, FloatingLabel, Button, InputGroup, Form, Row, Col } from "react-bootstrap";
import { useState, useEffect } from 'react';
import ThreadAPI from './ThreadAPI';
import decision_tree from "./CISA-Coordinator-v2.0.3.json";

const threadapi = new ThreadAPI();

/* TODO: pick tree from drop down */
const decisionTreeName = "CISA-Coordinator-v2.0.3";

const SSVCScore = (props) => {

    const [data, setData] = useState([]);
    const [children, setChildren ] = useState("");
    const [decisionPoint, setDecisionPoint] = useState(0);
    const [decisions, setDecisions] = useState([]);
    const [finalDecision, setFinalDecision] = useState("");
    const [decisionColor, setDecisionColor] = useState("success");
    const [vector, setVector] = useState("");
    const [shortKeys, setShortKeys] = useState([]);
    const [disabledButton, setDisabledButton] = useState(false);
    const [doUpdate, setDoUpdate] = useState(false);
    const [showNotes, setShowNotes] = useState([]);
    const [justifications, setJustifications] = useState({})

	
    useEffect(() => {

	switch(finalDecision) {
	case "Act":
	    setDecisionColor("danger");
	    break;
	case "Attend":
	    setDecisionColor("warning");
	    break;
	case "Track*":
	    setDecisionColor("info");
	    break;
	default:
	    setDecisionColor("success");
	}



    }, [finalDecision]);

    const load_ssvc = () => {
	let xkeys = {};
	let short_keys = {};
	let isparent = {};
	let ischild = {};

	ischild = data.decision_points.reduce((x,y) => {
	    /* Use either key or label to create a hash of everyone */
	    xkeys[y.label] = y;
	    if("key" in y) {
		xkeys[y.key] = y.label
		short_keys[y.label] = y.key
	    }
	    /* Use either key or label to mark the xkeys to a child
	       decision tree */
	    if ("options" in y) {
		y.options.forEach(z => {
		    if ("key" in z) {
			short_keys[z.label] = z.key
		    }
		})
	    }

	    if("children" in y) {
		isparent[y.label] = [];
		y.children.map(z => {
		    var tx = z.label;
		    if(("key" in z) && (z.key != "")) {
			tx = xkeys[z.key];
		    }
		    isparent[y.label].push(xkeys[tx]);
		    x[tx] = 1;
		});
	    }

	    return x;
	},{});
	setShortKeys(short_keys);
	setChildren(ischild);

	/* if we already have a score!!! */
	if (props.vul && props.vul.ssvc_decision) {
	    /* TODO: make sure apples 2 apples with the same decision tree name */
	    setFinalDecision(props.vul.ssvc_decision);
	    let dec_tree = props.vul.ssvc_decision_tree.filter(item => item.label != "date_scored");
	    setDecisions(dec_tree);
	    setDecisionPoint(data.decision_points.length-1);
	    setVector(props.vul.ssvc_vector);
	    if (props.vul.ssvc_justifications) {
		setJustifications(props.vul.ssvc_justifications);
	    }
	}


    }

    const fetchInitialData = async () => {

	/* load tree */
	try {
	    setData(decision_tree)

	} catch (err) {
	    console.log("Failed to Load CISA tree.  Loading default tree");

	}

    }

    useEffect(() => {
	if (data.decision_points) {
	    console.log("LOAD DECISION POINT")
	    load_ssvc(data);
	}
    }, [data])


    useEffect(() => {
	
	fetchInitialData();
    }, []);


    function update_decision(label, value) {

	let updated_decisions = decisions.map(d => {
	    if (d.label == label) {
		return {'label': d.label, 'value': value};
	    } else {
		return d
	    }
	});
	setDecisions(updated_decisions);
    }

    const get_combo_decision = (child_decisions) => {

	let deduce = {};
	child_decisions.forEach((x) => {
	    deduce[x.label] = x.value;
	});

	let parent_name = "";
	data.decision_points.forEach((point) => {
	    if ('children' in point) {
		parent_name = point.label;
		/* this is the complex decision */
		point.options.forEach((option) => {
		    option.child_combinations.forEach((child) => {
			let reset = [];
			child.forEach((r) => {
			    if (r.child_option_labels.includes(deduce[r.child_label])) {
				reset.push(option.label);
			    }
			})
			if (reset.length == Object.keys(deduce).length) {
			    /* we found the answer */
			    console.log("WE GOT THE ANSWER. Add to Decision");
			    console.log(reset);
			    if (decisions.some((x) => x.label == parent_name)) {
				/* this is an update */
				console.log("UPDATE THE DECISION!!!");
				update_decision(parent_name, reset[0]);
			    } else {
				setDecisions(decisions => [...decisions, {'label': parent_name, 'value': reset[0]}])
				//setDecisionPoint(decisionPoint+1);
				moveDecisionPoint(parent_name, null);
			    }

			}

		    });
		});
	    }
	})
    }

    function compare_dictionaries(x, y) {
	for (const [key, value] of Object.entries(x)) {
	    if (y[key] !== value) {
		return false;
	    }
	}
	return true
    }


    useEffect(() => {
	if (vector && (doUpdate == true)) {
	    setDoUpdate(false);
	    get_final_decision();
	}
    }, [vector]);


    const get_final_decision = () => {
	let deduce = {};
        decisions.forEach((x) => {
	    if (x.label !== "Decision") {
		if (!Object.keys(children).includes(x.label)) {
		    /* ignore children decisions */
		    deduce[x.label] = x.value;
		}
	    }
        });

	for (var x =0; x < data.decisions_table.length; x++) {
	    if (compare_dictionaries(deduce, data.decisions_table[x])) {
		if (finalDecision) {
		    /* we just need to update final decision */
		    update_decision("Decision",  data.decisions_table[x]["Decision"]);
		} else {
		    setFinalDecision(data.decisions_table[x]["Decision"]);
		    setDecisions(decisions => [...decisions, {'label': 'Decision', 'value': data.decisions_table[x]["Decision"]}])
		}
		setFinalDecision(data.decisions_table[x]["Decision"]);
		console.log("FINAL DECISION IS ", data.decisions_table[x]["Decision"]);
		break;
	    }
	}
    }


    const make_vector = () => {
	var computed = "SSVC/v2/"
	var vector =  decisions.forEach((d, index) => {
	    let k = d.label;
	    let v = d.value;
	    if (d.label in shortKeys) {
		k = shortKeys[k].toUpperCase();
	    } else {
		k = d.label[0].toUpperCase();
	    }
	    if (d.value in shortKeys) {
		v = shortKeys[v].toUpperCase();
	    } else {
		v = d.value[0].toUpperCase();
	    }
	    computed = computed + k+":"+v+"/"
	})
	var q = new Date().toISOString().replace(/\..*$/,'Z');
	computed = computed+q+"/"
	setVector(computed);
    }

    useEffect(() => {
	let child_decisions = [];

	try {
	    if (decisions.length && data.decision_points.length) {
		if (decisions.length == data.decision_points.length) {
		    /* all decisions have been made */
		    if (vector && doUpdate == false) {
			/* if we already have vector, this is just an update
			   and we need to recalculate decisions */
			setDoUpdate(true);
			child_decisions = decisions.filter(item => Object.keys(children).includes(item.label));
			get_combo_decision(child_decisions);
		    } else {
			make_vector();
		    }

		} else if (decisions.length == (data.decision_points.length - 1)) {
		    /* FIND FINAL DECISION */
		    get_final_decision();
		} else {
		    /* are both decisions with children made? */
		    if (children) {
			child_decisions = decisions.filter(item => Object.keys(children).includes(item.label));
			if (child_decisions.length == Object.keys(children).length) {
			    /* we have children decisions - find the combined decision */
			    get_combo_decision(child_decisions);
			}
		    }
		}
	    }
	} catch (err) {
	    console.log("Data not as expected: ", err);
	}

    }, [decisions]);

    const moveDecisionPoint = (label, e) => {
	/* get next decision point */
	data.decision_points.forEach((d, index) => {
	    if (d.label == label) {
		if (index == decisionPoint) {
		    if (e) {
			setDecisions(decisions => [...decisions, {'label':label, 'value': e.target.value}]);
		    }
		    /* if we're going through the decision tree, move it forward */
		    if ((index+2) != data.decision_points.length) {
			/* that was the last decision point */
			setDecisionPoint(index+1);
		    }
		} else {
		    /* this is an update to the decision tree */
		    if (e) {
			update_decision(label, e.target.value);
		    }
		}
	    }
	})
    }

    const GetComplexDecision = ({decisions, label}) => {

	let complex = decisions.filter((item) => (item.label == label));
	let variant = "info";
	if (complex.length == 1) {
	    switch(complex[0]['value']) {
	    case 'high':
		variant="danger";
		break;
	    case 'medium':
		variant='info';
		break;
	    case 'low':
		variant='success';
		break;
	    default:
		variant='secondary';
	    }
	}
	return (
	    <Alert
		variant={variant} >
		{complex.map((item, index) => {
		    return (
			<div key={`${item.label}-decision`} className="text-center">{item.label} is {item.value}</div>
		    )
		})}
	    </Alert>
	)
    };

    const removeScore = () => {
	props.remove();
	setDecisionPoint(0);
	setFinalDecision("");
	setDecisions([]);
	setVector("");
    }
    
    const SSVCPopover = React.forwardRef(
	({ popper, children, show: _, ...props }, ref) => {
	    const {label, options} = props;

	    useEffect(() => {
		popper.scheduleUpdate();
	    }, [children, popper]);

	    return (
		<Popover ref={ref} body {...props}>
		    <Popover.Header as="h3">{label}</Popover.Header>
		    <Popover.Body>
			{options.map((o, index) => {
			    return (
				<p key={`${o.label}-${index}`}>
				    <b>{o.label}</b>:{"  "}
				    {o.description}
				</p>
			    )
			})}
		    </Popover.Body>
		</Popover>
	    )
	}
    )

    const showDecisionNotes = (label) => {
	console.log(label);
	console.log(justifications);
	if (showNotes.includes(label)) {
	    /* remove it */
	    setShowNotes((item) => item.filter((select) => select != label))
	} else {
	    setShowNotes(showNotes => [...showNotes, label])
	}
    }
    
    const handleAddDecisionNotes = (e) => {
	const key = e.target.name;
	const value = e.target.value;
	setJustifications({
	    ...justifications,
	    [key]:value
	}
			 );
    }
    
    
    const saveScore = async () => {
	setDisabledButton(true);
	const formData = {};
	formData['justifications'] = justifications;
	formData['decision_tree'] = decisions;
	formData['tree_type'] = decisionTreeName;
	formData['final_decision'] = finalDecision;
	formData['vector'] = vector;
	console.log(formData);
	props.save(formData);
    }

    return (
	<Row>
	    <Col lg={12}>
		<h5>Currently using <b>{decisionTreeName}</b> as Decision Tree</h5>
		<p>Click decision button to view description of each decision point.</p>
		{data.decision_points ?
		 <>
		     {data.decision_points.map((d, index) => {
			 if (index <= decisionPoint) {

			     if ((d.decision_type == "simple") && (index != data.decision_points.length - 1)) {
				 let checked = "";
				 if (props.vul && props.vul.ssvc_decision_tree) {
				     let old = props.vul.ssvc_decision_tree.filter((b) => b.label == d.label)
				     if (old.length > 0) {
					 checked = old[0]['value']
				     }
				 }
				     {/*<div key={`${d.label}-${index}`} className="mb-3 d-flex align-start gap-5">*/}
				 return (
				     <React.Fragment key={`${d.label}-${index}`}>
					 <Row className="pb-3">
					     <Col lg={4} className="d-grid">
						 <OverlayTrigger
						     trigger="click"
						     rootClose
						     placement="right"
						     overlay={<SSVCPopover
								  label={d.label}
								  options={d.options}
							      />}
						 >
						     <Button
							 variant="primary">
							 {d.label}
						     </Button>
						 </OverlayTrigger>
					     </Col>
					     <Col lg={6}>
						 {d.options.map((option, index) => {
						     return (
							 <Form.Check
							     type="radio"
							     inline
							     key={`${d.label}-${option.label}`}
							     label={option.label}
							     aria-label={option.label}
							     name={d.label}
							     value={option.label}
							     defaultChecked={checked == option.label?true:false}
							     onChange={(e)=>(moveDecisionPoint(d.label, e))}
							 />
						     )
						 })
						 }
					     </Col>
					     <Col lg={2} className="text-end">
						 <Button variant="btn-icon p-0 text-nowrap" onClick={() => showDecisionNotes(d.label)}><i className="fas fa-plus"></i>
						     {Object.keys(justifications).includes(d.label) ?
						      ` View Notes`
						      :
						      ` Add Notes`
						     }
						 </Button>
					     </Col>
					 </Row>
					 {showNotes.includes(d.label) &&
					  <Row className="pb-3">
					      <Col lg={12}>
						  <Form.Label>{d.label} Decision Justification:</Form.Label>
						  <Form.Control name={d.label} as="textarea" rows={3} value={justifications[d.label]} onChange={handleAddDecisionNotes} />
					      </Col>
					  </Row>
					 }
				     </React.Fragment>
				 )
			     } else if (index != data.decision_points.length - 1) {
				 return (
				     <GetComplexDecision
					 decisions = {decisions}
					 label={d.label}
					 key={`${d.label}-complex`}
				     />
				 )
			     }
			 }
		     })}
		 </>
		 :
		 <p>Loading decision points...</p>
		}
		{finalDecision &&
		 <>
		     <Alert variant={decisionColor}><div className="text-center">Decision is {finalDecision}</div><br/>
		     SSVC Vector: {vector}</Alert>

		     <div className="d-flex justify-content-between mt-3">
                         {props.vul && props.vul.ssvc_vector ?
			  
                          <Button variant="danger" onClick={(e)=>removeScore(e)}>
                              Delete Score
                          </Button>
                          :
                          <div></div>
                         }
			 
			 <div>
			     <div className="d-flex justify-content-end gap-2">
				 <Button variant="secondary" onClick={props.hideModal}>
				     Cancel
				 </Button>
				 <Button variant="primary"
					 disabled={disabledButton ? true: false}
					 type="submit"
					 onClick={(e)=>saveScore()}>
				 {disabledButton ? <>Saving...</>:<>Save Score</>}</Button>
			     </div>
			 </div>
		     </div>
		 </>
		}
	    </Col>
	</Row>
    )

}
export default SSVCScore;
