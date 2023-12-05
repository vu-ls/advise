import React, { useState, useEffect, useMemo }  from 'react';
import {Row, Button, Form, InputGroup, Dropdown, DropdownButton, Alert, ListGroup, Card, Col} from 'react-bootstrap';
import { format, formatDistance } from 'date-fns'
import {
  DateRangePicker,
  defaultStaticRanges,
  createStaticRanges
} from "react-date-range";
import {
  addDays,
  endOfDay,
  startOfDay,
  startOfMonth,
  endOfMonth,
  addMonths,
  startOfWeek,
  endOfWeek,
  startOfYear,
  endOfYear,
  addYears
} from "date-fns";

import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";


const defineds = {
    startOfLifetime: startOfYear(addYears(new Date(), -20)),
    startOfWeek: startOfWeek(new Date()),
    endOfWeek: endOfWeek(new Date()),
    startOfLastWeek: startOfWeek(addDays(new Date(), -7)),
    endOfLastWeek: endOfWeek(addDays(new Date(), -7)),
    startOfToday: startOfDay(new Date()),
    startOfLastSevenDay: startOfDay(addDays(new Date(), -7)),
    startOfLastThirtyDay: startOfDay(addDays(new Date(), -30)),
    startOfLastNintyDay: startOfDay(addDays(new Date(), -90)),
    endOfToday: endOfDay(new Date()),
    startOfYesterday: startOfDay(addDays(new Date(), -1)),
    endOfYesterday: endOfDay(addDays(new Date(), -1)),
    startOfMonth: startOfMonth(new Date()),
    endOfMonth: endOfMonth(new Date()),
    startOfLastMonth: startOfMonth(addMonths(new Date(), -1)),
    endOfLastMonth: endOfMonth(addMonths(new Date(), -1)),
    startOfYear: startOfYear(new Date()),
    endOfYear: endOfYear(new Date()),
    startOflastYear: startOfYear(addYears(new Date(), -1)),
    endOflastYear: endOfYear(addYears(new Date(), -1))
};

const ReportDatePicker = (props) => {

    const [dateRangeTitle, setDateRangeTitle] = useState("Last 30 days");
    const [show, setShow] = useState(false);
    const [selectionRange, setSelectionRange] = useState([{startDate: defineds.startOfLastThirtyDay,
							   endDate: defineds.endOfToday,
							   key: 'selection'
							  }]);

    const CustomDateRangeTitle = () => {

	if (selectionRange.length) {
	    console.log(selectionRange)
	    return (
		<>
		    <i className="fas fa-calendar"></i> {dateRangeTitle}: {format(new Date(selectionRange[0].startDate), 'yyyy-MM-dd')} - {format(new Date(selectionRange[0].endDate), 'yyyy-MM-dd')}
		</>
	    )
	}
    
    }

    const sideBarOptions = () => {
	const customDateObjects = [
	    {
		label: "Lifetime",
		range: () => ({
		    startDate: defineds.startOfLifetime,
		    endDate: defineds.endOfToday
		})
	    },
	    {
		label: "Today",
		range: () => ({
		    startDate: defineds.startOfToday,
		    endDate: defineds.endOfToday
		})
	    },
	    {
		label: "Last 7 Days",
		range: () => ({
		    startDate: defineds.startOfLastSevenDay,
		    endDate: defineds.endOfToday
		})
	    },
	    {
		label: "Last 30 Days",
		range: () => ({
		    startDate: defineds.startOfLastThirtyDay,
		    endDate: defineds.endOfToday
		})
	    },
	    {
		label: "Last 90 Days",
		range: () => ({
		    startDate: defineds.startOfLastNintyDay,
		    endDate: defineds.endOfToday
		})
	    },
	    {
		label: "This Week",
		range: () => ({
		    startDate: defineds.startOfWeek,
		    endDate: defineds.endOfWeek
		})
	    },
	    {
		label: "Last Week",
		range: () => ({
		    startDate: defineds.startOfLastWeek,
		    endDate: defineds.endOfLastWeek
		})
	    },
	    {
		label: "This Month",
		range: () => ({
		    startDate: defineds.startOfMonth,
		    endDate: defineds.endOfMonth
		})
	    },
	    {
		label: "Last Month",
		range: () => ({
		    startDate: defineds.startOfLastMonth,
		    endDate: defineds.endOfLastMonth
		})
	    },
	    {
		label: "This Year",
		range: () => ({
		    startDate: defineds.startOfYear,
		    endDate: defineds.endOfYear
		})
	    },
	    {
		label: "Last Year",
		range: () => ({
		    startDate: defineds.startOflastYear,
		    endDate: defineds.endOflastYear
		})
	    }
	];
	
	return customDateObjects;
    };
    
    const sideBar = sideBarOptions();
    
    const staticRanges = [
	// ...defaultStaticRanges,
	...createStaticRanges(sideBar)
    ];


    const changeDateRange = (e) => {
	setSelectionRange([e.selection]);

	const knownRange = staticRanges.find((x) => x.isSelected(e.selection));
	
	if (knownRange) {
	    console.log(`Selected known range ${knownRange.label}`)
	    setDateRangeTitle(knownRange.label);
	} else {
	    console.log(`Selected custom range ${e}`)
	    setDateRangeTitle("Custom Range");
	}
    }

    
    const submitDate = () => {
	console.log("in submitDate");
	setShow(false);

	props.onChange(selectionRange);
    }

    useEffect(() => {
	/* send default selectionrange */
	props.onChange(selectionRange);
    }, [selectionRange]);
    
    const CustomDropdownMenu = React.forwardRef(
	({ children, style, className, 'aria-labelledby': labeledBy }, ref) => {

	    return (
		<>
		<DateRangePicker
		    showSelectionPreview={true}
		    ranges={selectionRange}
		    onChange={item=>{changeDateRange(item)}}
		    maxDate = {defineds.endOfToday}
		    staticRanges = {staticRanges}
		    months={2}
		    direction="horizontal"
		/>
		</>
	    )
	});
    

    return (
	<>
	    {selectionRange ?
	     <DropdownButton variant="outline-primary" title={<CustomDateRangeTitle />} onClick={(e)=>setShow(true)}>
		 <Dropdown.Menu show={show} as={CustomDropdownMenu}>

		 </Dropdown.Menu>
	     </DropdownButton>
	      :
	      ""
	    }
	</>
    )


}


export default ReportDatePicker;
    





