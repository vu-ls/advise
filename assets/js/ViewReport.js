import React, { useState, useEffect } from 'react'
import {Card, Alert, DropdownButton, Dropdown, InputGroup, FloatingLabel, Form, Container, Row, Col, Tab, Tabs, Nav, Button} from 'react-bootstrap';
import '../css/casethread.css';
import {format, formatDistance} from 'date-fns';




const ViewReport = (report) => {
    let orig_report = report.report;
    let date = new Date(orig_report.received);

    return (
        <div>                                                                                           
            <Alert variant="secondary">
                This report was submitted by <b>{orig_report.submitter}</b> on {format(date, 'yyyy-MM-dd')}
            </Alert>                                                                                    
            <Row>                                                                                       
            {orig_report.report.map((r, index) => {
                return (
                    <Col lg={6} className="mb-2" key={index}>                                           
                        <label className="form-label"><b>{ r.question }</b></label>                     
                        <br/>                                                                           
                            {Array.isArray(r.answer) ?
			     <span className="answer">                                                  
                                 <ul>                                                                   
                                     {r.answer.map((answer, index) => {
                                         return (
                                             <li key={index}>{answer}</li>
                                         )
                                     })
                                     }                                                                  
                                 </ul>                                                                  
                             </span>                                                                    
                             :                                                                          
                             <span className="answer">{ r.answer }</span>
                            }                                                                           
                    </Col>
                )
            })}                                                                                         
            </Row>                                                                                      
        </div>
    )
}

export default ViewReport;
