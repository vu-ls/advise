import React, { useState, useEffect } from 'react';
import {Dropdown, Form, DropdownButton} from 'react-bootstrap';
import DisplayLogo from './DisplayLogo';



const CustomMenu = React.forwardRef(
    ({ children, style, className, 'aria-labelledby': labeledBy }, ref) => {
        const [value, setValue] = useState('');
        return (
            <div
                ref={ref}
                style={style}
                className={className}
                aria-labelledby={labeledBy}
            >
                <Form.Control
                    autoFocus
                    className="mx-3 my-2 w-auto"
                    placeholder="Type to filter..."
                    onChange={(e) => setValue(e.target.value)}
                    value={value}
                />
                <ul className="list-unstyled">
                    {React.Children.toArray(children).filter(
                        (child) =>
                        !value || child.props.children.key.toLowerCase().startsWith(value),
                    )}
                </ul>
            </div>
        );
    },
);


const AssignmentDropdownButton = (props) => {

    console.log(props);

    const popperConfig = {
        strategy: "fixed"
    };

    let title = (
        <div className="d-flex align-items-center gap-2 mt-2 mb-2">
            <DisplayLogo
                name="?"
            />
            <span className="participant">
                Unassigned
            </span>
        </div>
    );

    if (props.owners.length > 0) {
        title = props.owners.map((item, index) => {
            return (
                <div className="d-flex align-items-center gap-2 mt-2 mb-2" key={`owner=${item.id}`}>
                    <DisplayLogo
                        name={item.name}
                        color={item.logocolor}
                        photo={item.photo}
                    />
                    <span className="participant">
                        {item.name}
                    </span>
                </div>
            )
        })
    }

    return (
        <Dropdown onSelect={props.assignUser} className="assignment_dropdown">
            <Dropdown.Toggle className="p-0" variant="light">
                {title}
            </Dropdown.Toggle>
            <Dropdown.Menu style={{ margin:0}} as={CustomMenu} popperConfig={popperConfig} renderOnMount>

		{props.options ?
                 props.options.map((u, index) => {
                     return (
                         <Dropdown.Item key={u.name} eventKey={u.id}>
                             <div className="d-flex align-items-center gap-2 mt-2 mb-2" key={u.name}>
                                 <DisplayLogo
                                     name={u.name}
                                     color={u.logocolor}
                                     photo={u.photo}
                                 />
                                 <span className="participant">
                                     {u.name}
                                 </span>
                             </div>
                         </Dropdown.Item>
                     )
                 })
                 :""
                    }
		<Dropdown.Item key="Auto Assign" eventKey={0}>
                    <div className="d-flex align-items-center gap-2 mt-2 mb-2" key="Auto Assign">
                        <DisplayLogo
                            name="?"
                        />
                        <span className="participant">
                            Auto Assign
                        </span>
                    </div>
                </Dropdown.Item>
		{props.owners.length > 0 &&
                 <Dropdown.Item key="Unassign" eventKey={-1}>
                     <div className="d-flex align-items-center gap-2 mt-2 mb-2" key="Unassign">
                         <DisplayLogo
                             name="?"
                         />
                         <span className="participant">
                             Unassign
                         </span>
                     </div>
                 </Dropdown.Item>
                }
            </Dropdown.Menu>
        </Dropdown>
    )
}


export default AssignmentDropdownButton;
