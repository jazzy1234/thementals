const APP = 'escape-room';
const request = function(url,queryParams,body,method){
    url = !queryParams ? url : `${url}${Object.keys(queryParams).filter(k => queryParams[k]).length ? `?${Object.keys(queryParams).reduce((a,c) => `${a}${encodeURIComponent(c)}=${encodeURIComponent(queryParams[c])}&`, '')}` : ''}`;
    return fetch(url,{method:method,body:JSON.stringify(body),params:queryParams}).then(res => res.text());
};

AWS.config.region = 'us-east-1';
AWS.config.credentials = new AWS.CognitoIdentityCredentials({
    IdentityPoolId: 'us-east-1:758490a6-9a18-4066-ba81-abe5a94db80f',
});

const lambda = new AWS.Lambda();
const dynamodb = new AWS.DynamoDB.DocumentClient({convertEmptyValues:true});

const { Component, h, render } = window.preact;

class Login extends Component {
	emailLink(e){
		e.preventDefault();
		this.setState({loading:true});
		lambda.invoke({
			FunctionName:'escapeRoomEmailToken-production',
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
					onClick:e => this.props.setState({screen:'Play'})
				},'Play')
			),
			h('div',{class:'row'},
				h('button',{
					class:'col 12 w-100 btn',
					onClick:e => this.props.setState({screen:'Build'})
				},'Build')
			)
		)
	}
}

class Play extends Component {
	render(){
		return h('div',{class:'c'},
			
		)
	}
}

class Build extends Component {
	constructor(props){
		super(props);
		this.state = {
			room:{
				name:'',
				items:[]
			},
			item:{}
		};
	}
	componentDidMount(){
		interact('.build-item').draggable({
		    inertia: false,
		    modifiers: [
		      interact.modifiers.restrict({
		        restriction: "parent",
		        endOnly: true,
		        elementRect: { top: 0, left: 0, bottom: 1, right: 1 }
		      })
		    ],
		    onmove: (event) =>  {
		    	const item = this.getRoomItem(event);
		        const x = (parseFloat(event.target.getAttribute('data-x')) || 0) + event.dx;
		        const y = (parseFloat(event.target.getAttribute('data-y')) || 0) + event.dy;
			    event.target.style.webkitTransform = event.target.style.transform = 'translate(' + x + 'px, ' + y + 'px)';
			    event.target.setAttribute('data-x', x);
			    event.target.setAttribute('data-y', y);
			    item.x = x;
			    item.y = y;
			},
		    onend: (event) => {

		    }
		}).on('tap', event => {
			this.setState({item:this.getRoomItem(event)});
		}).on('hold', event => {
			this.removeItem(this.getRoomItem(event));
		});
	}
	getRoomItem(event){
		let i = 0, elem = event.currentTarget;
	    while ((elem=elem.previousSibling) != null) {
	    	++i;
	    }
		return this.state.room.items[i];
	}
	addItem(item){
		this.state.room.items.push(item);
		this.setState(this.state);
	}
	removeItem(item){
		this.state.room.items.splice(this.state.room.items.indexOf(item), 1);
		this.setState(this.state);
	}
	updateName(name){
		this.state.room.name = name;
		this.setState(this.state);
	}
	modal(){
		return h('div',{class:"modal-backdrop"},
		    h('div',{class:"modal-content scrollable"},
		    	
	    	)
	    )
	}
	download(e){
		e.preventDefault();
		download(JSON.stringify(this.state.room,null,2),'room.json','application/json');
	}
	render(){
		return h('div',{class:'c'},
			h('form',{class:'row',onSubmit:e => this.searchCards(e)},
				h('div',{class:'col 8'},
					h('input',{
						class:'card w-100',
						placeholder:'enter escape room name',
						value:this.state.room.name,
						onChange:e => this.updateName(e.target.value)
					})
				),
				h('div',{class:'col 1'},
					h('button',{class:'btn'},'Save')
				),
				h('div',{class:'col 1'},
					h('button',{class:'btn',onClick:e => this.download(e)},'Download')
				),
				h('div',{class:'col 1'},
					h(Upload,{label:'Upload',onUpload:room => this.setState({room})})
				)
			),
			h('div',{class:'c',id:'builder'},
				this.state.room.items.map(o => 
					h('div',{
						class:`build-item ${o.type}`,
						'data-x':o.x,
						'data-y':o.y,
						'style':`transform: translate(${o.x}px, ${o.y}px)`
					},o.name)
				)
			),
			h(BuildToolbar,Object.assign({
				addItem:item => this.addItem(item),
				refreshState:() => this.setState(this.state),
				item:this.state.item
			},this.props))
		)
	}
}

class BuildToolbar extends Component {
	addItem(type){
		this.props.addItem({
			x:0,
			y:0,
			name:'name',
			type:type
		});
	}
	update(key,value){
		this.props.item[key] = value;
		this.props.refreshState();
	}
	cypherFields(){

	}
	inputFields(){
		return [
			h('input',{class:'card',placeholder:'contents',value:this.props.item.contents,onInput:e => this.update('contents', e.target.value)}),
			h('input',{class:'card',placeholder:'input',value:this.props.item.input,onInput:e => this.update('input', e.target.value)})
		]
	}
	clueFields(){

	}
	fieldsForType(){
		switch(this.props.item.type){
			case 'cypher':
				return this.cypherFields();
			case 'input':
				return this.inputFields();
			case "clue":
				return this.clueFields();
		}
	}
	render(){
		return h('div',{class:'row build-toolbar'},
			h('div',{class:'row'},
				h('button',{'class':'btn input',onClick:e => this.addItem('input')},'Input'),
				h('button',{'class':'btn cypher',onClick:e => this.addItem('cypher')},'Cypher'),
				h('button',{'class':'btn clue',onClick:e => this.addItem('clue')},'Clue')
			),
			this.props.item.type && h('div',{class:'row'},
				h('input',{class:'card',placeholder:'name',value:this.props.item.name,onInput:e => this.update('name', e.target.value)}),
				h('input',{class:'card',placeholder:'description',value:this.props.item.description,onInput:e => this.update('description', e.target.value)}),
				this.fieldsForType()
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

class Arena extends Component {
	constructor(props){
		super(props);
		this.state = {
			item:{}
		};
	}
	componentDidMount(){
		interact('.arena-item').on('tap', event => {
			this.setState({item:this.getRoomItem(event)});
		});
	}
	getRoomItem(event){
		let i = 0, elem = event.currentTarget;
	    while ((elem=elem.previousSibling) != null) {
	    	++i;
	    }
		return this.state.room.items[i];
	}
	modal(){
		return h('div',{class:"modal-backdrop"},
		    h('div',{class:"modal-content scrollable"},
		    	
	    	)
	    )
	}
	render(){
		return h('div',{class:'c'},
			h('h5',{}, this.props.room.name),
			h('div',{class:'c',id:'arena'},
				this.props.room.items.map(o => 
					h('div',{
						class:`arena-item ${o.type}`,
						'data-x':o.x,
						'data-y':o.y,
						'style':`transform: translate(${o.x}px, ${o.y}px)`
					},o.name)
				)
			)
		)
	}
}

class GameOver extends Component {
	render(){
		return h('div',{class:'c'},'Game Over')
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
			case 'Play':
				return h(Play,this.props);
			case 'Build':
				return h(Build,this.props);
			case 'Arena':
				return h(Arena,Object.assign({},this.props,{room:this.state.room}));
			case 'GameOver':
				return h(GameOver,Object.assign({},this.props,{room:this.state.room}));
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
			id:'_config',
			name:'_config'
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