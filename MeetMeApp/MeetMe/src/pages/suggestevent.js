import React, { Component } from "react";
import {
  AsyncStorage,
  StyleSheet,
  Text,
  View,
  String,
  TextInput,
  TouchableOpacity,
  Keyboard ,
  AutoGrowingTextInput,
  ScrollView,
  FlatList
} from "react-native";
import Toast from "react-native-simple-toast";
import {Actions} from "react-native-router-flux";
import NavigationForm from "../components/navigationForm";
import DateTimePicker from "react-native-modal-datetime-picker";
import RNPickerSelect from 'react-native-picker-select';
import Icon from "react-native-vector-icons/Foundation";
import {List, ListItem, SearchBar } from "react-native-elements";

export default class SuggestEvent extends Component {

  constructor(props){
    super(props);
    
    this.inputRefs = {};
		this.state={
            
            token: "",
            pickedDate: "",
            groupId: this.props.groupID,
            datePickerVisible: false,
            duration: 0,
            weekDay:"",
            suggestions:{},
            suggestionDisplay: false,
            loading: false,
            refreshing: false,
            items: [
                {
                    label: ' 0.5',
                    value:    0.5,
                },
                {
                    label: ' 1.0',
                    value:      1,
                },
                {
                    label: ' 1.5',
                    value:    1.5,
                },
                {
                    label: ' 2.0',
                    value:      2,
                },
                {
                    label: ' 2.5',
                    value:    2.5,
                },
                {
                    label: ' 3.0',
                    value:      3,
                },
                {
                    label: ' 3.5',
                    value:    3.5,
                },
                {
                    label: ' 4.0',
                    value:      4,
                },
                {
                    label: ' 4.5',
                    value:    4.5,
                },
                {
                    label: ' 5.0',
                    value:      5,
                },
                {
                  label: ' 5.5',
                  value:    5.5,
              },
              {
                  label: ' 6.0',
                  value:      6,
              },
              {
                  label: ' 6.5',
                  value:    6.5,
              },
              {
                  label: ' 7.0',
                  value:      7,
              },
              {
                  label: ' 7.5',
                  value:    7.5,
              },
              {
                  label: ' 8.0',
                  value:      8,
              },
              {
                  label: ' 8.5',
                  value:    8.5,
              },
              {
                  label: ' 9.0',
                  value:      9,
              },
              {
                  label: '10.0',
                  value:    10,
              },
              {
                  label: '10.5',
                  value:   10.5,
              },
            ],
    };

    //retrieve token from AsyncStorage
    AsyncStorage.getItem("token").then((value) => {
          this.setState({token: value});
      }).done();

  }

  //Call addEvent API, send groupId, eventName, description
  //pickedDate and endTime as key value pair in the post API 
  //call and allow user to sign up a new account
  addEvent = () => {
    const {token, pickedDate, groupId, duration, weekDay} = this.state;
    
    console.log("token:   " + token);

    if(pickedDate == "")
    {
      Toast.show("Please input a date for your event.", Toast.LONG);
    }
    else if(duration == 0)
    {
      Toast.show("Please input a duration for your event.", Toast.LONG);
    }
    else
    {
      fetch("http://104.42.79.90:2990/group/getAvailabilities?groupId=" + this.props.groupID,{
			      method:"post",
			      headers:{
				              "Accept": "application/json",
                              "Content-type": "application/json",
                              "Authorization": "Bearer " + token,
                  },
                  body:JSON.stringify({
                    day: duration,
                    threshold: weekDay,
          })				
		      })
		      .then((response) => response.json())
		      .then((responseJson) => {
                    console.log("responseJson:  " + responseJson);
                    console.log("responseJson.message:  " + responseJson.message);

                    this.setState({
                      suggestions: responseJson,
                      suggestionDisplay: true,
                    });	
          });
    }
    Keyboard.dismiss();
}

showStartDateTimePicker  = () => this.setState({ datePickerVisible: true });

hideDatePicker  = () => this.setState({ datePickerVisible: false });

// Interpret start date
handleDatePicked  = (date) => {
  var dateString = date.toString();
  // E.G: dateString = Sun Oct 21 2018 17:38:00 GMT-700 (PDT)
  var dateStringArray = dateString.split(" ",5);
  var day = dateStringArray[2];
  var month;
  var year = dateStringArray[3];
  var dateOutString;
      switch(dateStringArray[1]) {
        case "Jan":
          month = 1;
          break;
        case "Feb":
          month = 2;
          break;
        case "Mar":
          month = 3;
          break;
        case "Apr":
          month = 4;
          break;
        case "May":
          month = 5;
          break;
        case "Jun":
          month = 6;
          break;
        case "Jul":
          month = 7;
          break;
        case "Aug":
          month = 8;
          break;
        case "Sep":
          month = 9;
          break;
        case "Oct":
          month = 10;
          break;
        case "Nov":
          month = 11;
          break;
        case "Dec":
          month = 12;
          break;
        // In case of ERROR
        default:
          month = 13;
      }
  dateOutString = year + "-" + month + "-" + day;
  this.setState({
      pickedDate: dateOutString,
      weekDay: dateStringArray[0],
    });
  this.hideDatePicker();
};

//if user has input a start time, then use the user input to 
//display, otherwise, display "Start Time"
renderTime()
{
    if(this.state.pickedDate === "")
    {
      return("Choose a date for event");
    }
    else
    {
      return(this.state.pickedDate.toString());
    } 
}

 // Pull-down refresh
 handleRefresh = () => {
  this.setState(
    {
      refreshing: true
    },
    () => {
      this.getGroupInfo();
    }
  );
};

// TODO: Implement searchbar functionality
/*
handleSearch = (text) => {
  const formatQuery = text.toLowerCase();
  const data = _.filter(this.state.fullData, (user) => {
    return contains(user, formatQuery);
  })
  this.setState({ query: formatQuery, data});
};
*/

renderSeparator = () => {
  return (
    <View style={styles.renderSeparator}/>
  );
};

// Display searchbar
renderHeader = () => {
  return <SearchBar 
          platform={"android"}
          clearIcon={{ color: "grey" }}
          placeholder="Search Here..." 
          inputContainerStyle={styles.container} 
          round
          />;
};

// Display loading icon
renderFooter = () => {
  if (!this.state.loading) {
      return null;
  }

  return (
    <View style={styles.renderFooter}>
      <ActivityIndicator animating size="large" />
    </View>
  );
};

// Display empty group list text
renderEmptyList = () => {
  if (this.state.loading) {
    return null;
  }
  return (
    <View style={styles.container}>
      <Text style={styles.Text}>No time suggestion found. Try to
            change the date or duration!</Text>
    </View>
  );
};

renderRightIcon(startTime, endTime){
    return(
      <Icon name="x" style={styles.iconClose}                
       onPress={() => {Toast.show(startTime + "    " + endTime);}}
       />
    ); 
}

renderSuggestions()
{
  if(this.state.suggestionDisplay == true)
  {
    return(
      <FlatList
      data={this.state.suggestions.freeTimes}
      renderItem={({ item }) => (
        <ListItem 
          containerStyle={{backgroundColor: "#455a64", borderBottomWidth: 0}}
          roundAvatar
          titleStyle={styles.titleText}
          title={item.timeSlot}
          subtitleStyle={styles.subtitleText}
          subtitle={item.numUsersAvailable}
          rightIcon={this.renderRightIcon(item.timeSlot, item.timeSlot + "end")}
          >
        </ListItem>
      )}
      keyExtractor={(item) => item.timeSlot}
      ItemSeparatorComponent={this.renderSeparator}
      ListFooterComponent={this.renderFooter}
      ListEmptyComponent={this.renderEmptyList}
      onRefresh={this.handleRefresh}
      refreshing={this.state.refreshing}
      onEndReached={this.handleLoadMore}
      onEndReachedThreshold={50}
    />   
    );
  }
}

	render(){
		return(
      <View style={{flex: 1, backgroundColor: "#455a64"}}>
      <NavigationForm title="Find Recommended Event Time" type="suggestEvent"></NavigationForm>
      <ScrollView contentContainerStyle={styles.contentContainer}>
			<View style={styles.container}>
                    
                    <TouchableOpacity style={styles.datebutton} 
                      onPress={ this.showStartDateTimePicker }>
                    <Text style={styles.datebuttonText}>{this.renderTime()}
                    </Text>
                    </TouchableOpacity>   
                    <DateTimePicker 
                        mode="date"
                        isVisible={this.state.datePickerVisible}
                        onConfirm={this.handleDatePicked }
                        onCancel={this.hideDatePicker }
                    />

                <View style={{ paddingVertical: 5 }} />
                <RNPickerSelect
                    placeholder={{
                        label: 'Choose a date for event',
                        value: 0,
                    }}
                    items={this.state.items}
                    onValueChange={(value) => {
                        this.setState({
                          duration: value,
                        });
                    }}
                    onUpArrow={() => {
                        this.inputRefs.name.focus();
                    }}
                    onDownArrow={() => {
                        this.inputRefs.picker2.togglePicker();
                    }}
                    style={styles.input}
                    value={this.state.duration}
                    ref={(el) => {
                        this.inputRefs.picker = el;
                    }}
                />

                <TouchableOpacity style={styles.button} onPress={this.addEvent}>
                    <Text style={styles.buttonText}>{"Get Recommended Event Time"}</Text>
                </TouchableOpacity> 

                <Text>{"\n"}</Text>

                {this.renderSuggestions()} 
  		</View>
      </ScrollView>
      </View>
			);
	}
}

// Styles definition
const styles = StyleSheet.create({
  container : {
    backgroundColor:"#455a64",
    flex: 1,
    alignItems:"center",
    justifyContent :"center"
  },

  button: {
    width:300,
    backgroundColor:"#1c313a",
    borderRadius: 25,
    marginVertical: 10,
    paddingVertical: 13
  },

  buttonText: {
    fontSize:16,
    fontWeight:"500",
    color:"#ffffff",
    textAlign:"center"
  },

  datebutton: {
    width:300,
    backgroundColor:"rgba(255, 255,255,0.2)",
    borderRadius: 25,
    marginVertical: 10,
    paddingVertical: 13,
    paddingHorizontal:16,
  },
  datebuttonText: {
    fontSize:16,
    color:"#ffffff",
    textAlign:"left"
  },

  input: {
    fontSize: 16,
    paddingTop: 13,
    paddingHorizontal: 10,
    paddingBottom: 12,
    borderWidth: 1,
    borderColor: 'gray',
    borderRadius: 4,
    backgroundColor: 'white',
    color: 'black',
},

iconClose: {
  marginRight: 10,
  fontSize: 24,
  height: 22,
  color: "#CB3333",
},

renderFooter:
{
  paddingVertical: 20,
  borderTopWidth: 1,
  borderColor: "#455a64",
},

renderSeparator:
{
  height: 1,
  width: "95%",
  backgroundColor: "grey",
  marginLeft: "2.5%",
},

Text: {
  fontSize:16,
  fontWeight:"500",
  color:"#ffffff",
  textAlign:"center",
},
titleText: {
  color:"#ffffff",
  fontWeight: "300",
  fontSize:18
},
subtitleText: {
  color:"#ced0ce",
  fontSize:14,
  fontWeight: "100"
},
  
});