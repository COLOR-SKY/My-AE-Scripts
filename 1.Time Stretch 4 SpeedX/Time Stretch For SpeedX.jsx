/*
This script remaps the duration of selected layer to indicated portion, 
and apply SpeedX to fill it to its original length.

Creator: color·sky 
*/

function myScript(thisObj) {
    function myScript_buildUI(thisObj){
        var myPanel = (thisObj instanceof Panel) ? thisObj : new Window("palette", "Time Stretch For SpeedX", undefined, {resizeable:true});

        res = "group{orientation: 'column',\
        groupOne:Group{orientation: 'row',\
            slider: Slider{value:33, minvalue:0, maxvalue:100},\
            amt: EditText{characters: 3, justify: 'center'},\
            percent: StaticText{text: '%', characters: 2, justify: 'center'},\
            goButton: Button{text: 'Giao!'},\
        },\
        groupTwo: Group{orientation: 'row',\
            spaceFill: StaticText{text: '  '},\
            checkbox: Checkbox{text: 'Add Solid Background   (Check if using alpha)'},\
        },\
        groupThree: Group{orientation: 'column',\
            info: StaticText{text: '  color·sky 2022/08/11', characters: 30, justify: 'left', properties:{multiline: true}},\
        }\
        }";

        myPanel.grp = myPanel.add(res);

        //Defaults
        myPanel.grp.groupOne.amt.text = myPanel.grp.groupOne.slider.value;
        myPanel.grp.groupTwo.alignment = [ScriptUI.Alignment.LEFT, ScriptUI.Alignment.TOP]
        myPanel.grp.groupThree.alignment = [ScriptUI.Alignment.LEFT, ScriptUI.Alignment.TOP]
        myPanel.grp.groupTwo.checkbox.value = false;
        myPanel.layout.layout(true);

        //Events
        myPanel.grp.groupOne.slider.onChanging = function(){
            myPanel.grp.groupOne.amt.text = parseInt(this.value)
        }
        myPanel.grp.groupOne.amt.onChanging = function(){
            
            myPanel.grp.groupThree.info.text = "  Invalid input value";
            if (isNaN(this.text)){
                myPanel.grp.groupThree.info.text = "  Invalid input value";
            } else {
                num = parseInt(this.text);
                if (num >= myPanel.grp.groupOne.slider.minvalue && num <= myPanel.grp.groupOne.slider.maxvalue){
                    myPanel.grp.groupThree.info.text = "  Good to go";
                } else {
                    myPanel.grp.groupThree.info.text = "  Input out of bound";
                }
            }
        }
        
        myPanel.grp.groupOne.goButton.onClick = function(){
            myPanel.grp.groupThree.info.text = ""
            this.active = true;
            this.active = false;
            percent = parseInt(myPanel.grp.groupOne.slider.value)
            app.beginUndoGroup("Giao");
            stretchComps(percent, myPanel);
            myPanel.grp.groupThree.info.text += " - Finished :)";
            app.endUndoGroup();
        }
        return myPanel;
    }
    
    function stretchComps(percent, myPanel){
        /*
        Stretch comp time to certain percent
        */
        layers = app.project.activeItem.layers;
        selectedLayers = app.project.activeItem.selectedLayers; 
        if (selectedLayers.length < 1) {
            myPanel.grp.groupThree.info.text = "  Please select at least one layer";
            return;
        }

        const selectedIdx = [];
        var speedxfolderExists = false;
        var assetsFolder = null;
        for (var i = 1; i <= app.project.items.length; i++){
            if (app.project.items[i].name == "SpeedXComps") {
                speedxfolderExists = true;
                assetsFolder = app.project.items[i];
            }
        }
        if (!speedxfolderExists){
            assetsFolder = app.project.items.addFolder("SpeedXComps")
        }

        for (var i = 0; i < selectedLayers.length; i++){
            var layer = selectedLayers[i]
            selectedIdx.push(layer.index);
            oldStartTime = layer.startTime;
            layer.stretch = percent; 
            precomposed = layers.precompose([layer.index], layer.name+"Comp", false); // Layers will be de-selected after precomposition
            precomposed.parentFolder = assetsFolder;
            // Add comps to new folder
            
            // Adjust startTime of precomposed layers
            layeridx = selectedIdx[selectedIdx.length - 1];
            newLayer = app.project.activeItem.layers[layeridx];
            newLayer.startTime = oldStartTime;


            if (myPanel.grp.groupTwo.checkbox.value){
                solid = precomposed.layers.addSolid(
                    [0, 0, 255], // Solid blue layer
                    'background for keylight',
                    precomposed.width,
                    precomposed.height,
                    precomposed.pixelAspect
                ); 
                solid.moveToEnd();
            }
        }

        // Enable time remapping for selected layers
        for (var i = 0; i < selectedIdx.length; i++){
            idx = selectedIdx[i];
            layer = app.project.activeItem.layers[idx];
            oldDuration = layers[idx].outPoint - layers[idx].inPoint;
            newDuration = oldDuration / (percent / 100);
            layers[idx].timeRemapEnabled = true;
            layers[idx].outPoint = layers[idx].inPoint + newDuration; 
        }
        
        // Apply SpeedX Effect on selected layers
        for (var i = 0; i < selectedIdx.length; i++){
            idx = selectedIdx[i];
            speedx = layers[idx].Effects.addProperty("SpeedX");
            speedx.property(1).setValue(true);
            frameNumber = speedx.property(3);
            frameNumber.setValueAtTime(layers[idx].inPoint, 0)

            duration = layers[idx].outPoint - layers[idx].inPoint;
            lastFrame = duration * layers[idx].source.frameRate * percent / 100;
            frameNumber.setValueAtTime(layers[idx].outPoint, lastFrame);

            if (myPanel.grp.groupTwo.checkbox.value) {
                keylight = layers[idx].Effects.addProperty("Keylight (1.2)");
                keylightProperty = layers[idx].Effects.property("Keylight (1.2)");
                keylightProperty.property(4).setValue([0, 0, 1, 1]); // keylight screen color RGBA
            }
            // 这keylight居然是0-1区间...
        }
    }
 
    var myScriptPal = myScript_buildUI(thisObj);

    if (myScriptPal != null && myScriptPal instanceof Window){
       myScriptPal.center();
       myScriptPal.show();
    }

    myScriptPal

 }
 myScript(this);