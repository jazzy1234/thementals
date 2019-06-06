const APP = 'thementals';
const request = function(url,queryParams,body,method){
    url = !queryParams ? url : `${url}${Object.keys(queryParams).filter(k => queryParams[k]).length ? `?${Object.keys(queryParams).reduce((a,c) => `${a}${encodeURIComponent(c)}=${encodeURIComponent(queryParams[c])}&`, '')}` : ''}`;
    return fetch(url,{method:method,body:JSON.stringify(body),params:queryParams}).then(res => res.text());
};

AWS.config.region = 'us-east-1';
AWS.config.credentials = new AWS.CognitoIdentityCredentials({
    IdentityPoolId: 'us-east-1:3aaa762b-f775-4dbf-9698-814c72c57ff4'
});

const lambda = new AWS.Lambda();
const dynamodb = new AWS.DynamoDB.DocumentClient({convertEmptyValues:true});

const { Component, h, render } = window.preact;

class Login extends Component {
	emailLink(e){
		e.preventDefault();
		this.setState({loading:true});
		lambda.invoke({
			FunctionName:'thementalsEmailToken-production',
			Payload:JSON.stringify({
				email:this.state.email,
				application:this.props.application
			})
		},(err,data) => {
			this.setState({loading:false});
			if(err && err.message){
				console.error(err);
				alert('Could not send email');
			}else{
				alert('Sent email with token');
			}
		});
	}
	render() {
		return h('form',{class:'c',onSubmit:e => this.emailLink(e)},
			h('h4',{class:'row'},this.props.title),
			h('input',{class:'card w-100',placeholder:'Enter Email',type:'email',onInput:e => this.setState({email:e.target.value})}),
			h('div',{class:'row'},
				h('button',{class:`btn ${this.state.loading ? 'loader' : ''}`},'Email Link')
			)
		)
	}
}

class Main extends Component {
	componentDidMount(){
		this.props.id && dynamodb.get({
			TableName:APP,
			Key:{
				id:this.props.id
			}
		},(e,d) => {
			if(e){
				console.error(e);
			}else if(d.Item){
				if(d.Item.gameOver){
					this.props.setState({screen:'GameOver',room:d.Item});
				}else{
					this.props.setState({screen:'Arena',room:d.Item});
				}
			}
		});
	}
	render(){
		return h('div',{class:'c'},
			h('div',{class:'row'},
				h('button',{
					class:'col 12 w-100 btn',
					onClick:e => this.props.setState({screen:'Quiz'})
				},'Play')
			)
		)
	}
}

class Upload extends Component{
	constructor(props){
		super(props);
		this.state = {fileReader:new FileReader()};
		this.state.fileReader.onloadend = () => {
			props.onUpload(JSON.parse(this.state.fileReader.result));
		}
	}
	handleUpload(e){
		this.state.fileReader.readAsText(e.target.files[0]);
	}
	render(){
		return h('div',{class:'upload btn'},
			h('span',{},this.props.label),
			h('input',{type:'file',onChange:e => this.handleUpload(e)})
		)
	}
}

class Container extends Component {
	componentWillMount() {
		this.props.setState = (state) => this.setState(state);
		this.props.updateId = id => {
			this.props.id = id;
			this.setState({screen:undefined});
		}
	}
	render() {
		if (!this.props.token){
			return h(Login,this.props);
		}
		switch(this.state.screen){
			default:
				return h(Main,this.props);
		}
	}
}

document.addEventListener('DOMContentLoaded',e => {
	const params = new URLSearchParams(window.location.search);
	dynamodb.get({
		TableName:APP,
		Key:{
			id:'_config'
		}
	},(e,d) => {
		if(e){
			console.error(e);
		}else{
			render(h(Container,{
				token:params.get('token'),
				email:params.get('email'),
				title:APP,
				id:params.get('id'),
				config:d.Item
			}), document.body)
		}
	})
})