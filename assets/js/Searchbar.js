import React from 'react';
import {InputGroup, Form, Button} from 'react-bootstrap';

const Searchbar = ({ onChange, value }) => {
  return (
      <InputGroup className="w-100">                                                              
          <Form.Control
              placeholder="Search Cases"
              aria-label="Search Cases"
              aria-describedby="searchcases"
              value={value}
              onChange={onChange}
          />                                                                                      
          <Button variant="btn btn-outline-secondary" id="button-addon2" type="submit">           
              <i className="fas fa-search"></i>                                                   
          </Button>                                                                               
      </InputGroup>
  );
};

export default Searchbar;
