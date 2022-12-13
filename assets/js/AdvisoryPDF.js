import React from 'react';
import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer';


const styles = StyleSheet.create({
  page: {
    backgroundColor: "#ffffff"
  },
  section: {
    margin: 10,
    padding: 10,
    flexGrow: 1
  },
  AdvisoryTitle: {
      fontSize: 24,
      marginBottom: 15,
      textAlign: 'center',
      marginTop: 20,
      
  },
    AdvisoryContent: {
	margin: 20,
	fontSize: 12,
    },
});

export const AdvisoryPDF = (props) => {

    return (
	<Document>
	    <Page size="A4">
		<View>
		    <Text style={styles.AdvisoryTitle}>
			{props.data.title}
		    </Text>
		</View>
		<View>
		    <Text style={styles.AdvisoryContent}>
			{props.data.content}
		    </Text>
		</View>
	    </Page>
	</Document>
    );
};
