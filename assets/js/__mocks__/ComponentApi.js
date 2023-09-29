

const mock = jest.fn().mockImplementation(() => {

    return {
	getCompStatusUploads: () => {
	    return Promise.resolve([]);
	}
    }
});

export default mock;
