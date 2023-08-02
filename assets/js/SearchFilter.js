import React from 'react';
import {InputGroup, Form, Button, DropdownButton, Dropdown} from 'react-bootstrap';

const SearchFilter = ({ onChange, value, owner, status }) => {

  return (
      <InputGroup className="w-100">                                                              
          <Form.Control
              placeholder="Search Cases"
              aria-label="Search Cases"
              aria-describedby="searchcases"
              
              onChange={(e)=>onChange(e, "search")}
          />                                                                                      
          <Button variant="btn btn-outline-secondary" id="button-addon2" type="submit">           
              <i className="fas fa-search"></i>                                                   
          </Button>

	  <DropdownButton
              variant="outline-secondary"
              title="Filter"
              id="input-group-dropdown-3"
          >
	      {owner.length > 0 &&
	       <>
		  <Form.Label className="px-3">Owner</Form.Label>
		  {owner.map((o, index) => {
		  return (
		      <Dropdown.ItemText key={index}>
			  <Form.Check
			      onChange={(e)=>onChange(e, "owner")}
			      label={o.name}
			      value={o.id}
			      title={o.name}
			      data-testid={`check-${o.name}`}
			      type="checkbox"
			  />
		      </Dropdown.ItemText>
		  )
		  })}
		  <Dropdown.Divider />
	       </>
	      }

	      <Form.Label className="px-3">Status</Form.Label>                                                                                                                               {status.map((o, index) => {
                  return (
                      <Dropdown.ItemText key={index}>                                                                                                     
                          <Form.Check
			      onChange={(e)=>onChange(e, "status")}
                              label={o.name}
                              value={o.id}
			      data-testid={`check-${o.name}`}
			      title={o.name}
                              type="checkbox"
                          />                                                                                                                                 
                      </Dropdown.ItemText>
                  )
              })} 
	  </DropdownButton>
	  
	  
      </InputGroup>
  );
};

export default SearchFilter;
