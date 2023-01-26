function myScript(thisObj) {
    var colorIdx = 0; // Indicate next color of child solid
    function myScript_buildUI(thisObj){
        var myPanel = (thisObj instanceof Panel) ? thisObj : new Window("palette", "Screen Splitter v1.0", undefined, {resizeable:true});

        res = "group{orientation: 'column',\
        groupOne: Group{orientation: 'row',\
            info: StaticText{text: 'Partition: '},\
            vertical: Button{text: 'Vertically'},\
            horizontal: Button{text: 'Horizontally'},\
        },\
        groupTwo: Group{orientation: 'row',\
            info: StaticText{text: 'Margin: '},\
            marginSlider: Slider{value:10, minvalue:0, maxvalue:100},\
            margin: EditText{characters: 3, justify: 'center'},\
            pixels: StaticText{text: 'pixels', justify: 'center'},\
        },\
        groupThree: Group{orientation: 'row',\
            highlight: Button{text: 'Show Layer'},\
            setMatte: Button{text: 'Set Matte'},\
            merge: Button{text: 'Merge'},\
        \
        },\
        groupFour: Group{orientation: 'column',\
            info: StaticText{text: 'Screen Splitter v1.0 by color·sky 2023/01/26', characters: 30, justify: 'left', properties:{multiline: true}},\
        }\
        }";
        myPanel.grp = myPanel.add(res);
        myPanel.grp.groupOne.alignment = [ScriptUI.Alignment.LEFT, ScriptUI.Alignment.TOP]
        myPanel.grp.groupTwo.alignment = [ScriptUI.Alignment.LEFT, ScriptUI.Alignment.TOP]
        myPanel.grp.groupTwo.margin.text = myPanel.grp.groupTwo.marginSlider.value;
        myPanel.grp.groupTwo.marginSlider.onChanging = function(){
            app.beginUndoGroup("Adjust Margin");
            myPanel.grp.groupTwo.margin.text = parseInt(this.value)
            app.endUndoGroup();
        }
        myPanel.grp.groupTwo.marginSlider.onChange = function() {
            app.beginUndoGroup("Adjust Margin");
            adjustMargin(parseInt(this.value));
            app.endUndoGroup();
        }
        myPanel.grp.groupTwo.margin.onChanging = function(){
            myPanel.grp.groupFour.info.text = "  Invalid input value";
            if (isNaN(this.text)){
                myPanel.grp.groupFour.info.text = "  Invalid input value";
            } else {
                num = parseInt(this.text);
                if (num >= myPanel.grp.groupTwo.marginSlider.minvalue && num <= myPanel.grp.groupTwo.marginSlider.maxvalue){
                    myPanel.grp.groupFour.info.text = "  Good to go";
                } else {
                    myPanel.grp.groupFour.info.text = "  Input out of bound";
                }
            }
        }
        myPanel.grp.groupThree.highlight.helpTip = "Place layer_selector to the block you want to highlight."
        myPanel.grp.groupThree.highlight.onClick = function(){
            app.beginUndoGroup("Highlight Layer");
            this.active = true;
            this.active = false;
            highlightChildren(myPanel);
            app.endUndoGroup();
        }
        myPanel.grp.groupThree.setMatte.onClick = function(){
            app.beginUndoGroup("Set Matte");
            this.active = true;
            this.active = false;
            setMatte(myPanel);
            app.endUndoGroup();
        }
        myPanel.grp.groupThree.merge.onClick = function(){
            app.beginUndoGroup("Merge");
            this.active = true;
            this.active = false;
            mergeChildren();
            app.endUndoGroup();
        }
        myPanel.grp.groupOne.vertical.onClick = function(){
            app.beginUndoGroup("Vertical Split");
            this.active = true;
            this.active = false;
            if (validateSelection(myPanel)){
                split_layer(myPanel, "v");
            }
            app.endUndoGroup();
        }
        myPanel.grp.groupOne.horizontal.onClick = function(){
            app.beginUndoGroup("Horizontal Split");
            this.active = true;
            this.active = false;
            if (validateSelection(myPanel)){
                split_layer(myPanel, "h");
            }
            app.endUndoGroup();
        }
        myPanel.layout.layout(true);
        return myPanel;
    }

    function setMatte(myPanel){
        var myComp = app.project.activeItem;
        var selectedLayer = myComp.selectedLayers;
        var layerCollection = myComp.layers;
        var layer_selector_layer = myComp.layer("layer_selector");
        myPanel.grp.groupFour.info.text = "Select a layer as source, then place layer_selector to the block you want to use as matte.";
        if (layer_selector_layer == null){
            layer_selector_layer = myComp.layers.addSolid([156/255,116/255,114/255], "layer_selector", 80, 80, 1);
            layer_selector_layer.property("rotation").setValue(45);
            layer_selector_layer.guideLayer = true;
            layer_selector_layer.moveToBeginning();
            return;
        }
        layer_selector_layer.moveToBeginning();
        pos = layer_selector_layer.property("position").value;
        matte_layer = null
        for (var i = 1; i <= layerCollection.length; i++){
            layer = layerCollection[i];
            layer.selected = false;
            if (layer.nullLayer || !layer.enabled || layer.Effects.property(layer.name) == null)
                continue;
            else {
                cp = layer.Effects.property(layer.name)
                ul = cp.property(1).value;
                lr = cp.property(4).value;
                // Check if pos is in the bounding box of corner pin
                if (pos[0] >= ul[0] && pos[0] <= lr[0] && pos[1] >= ul[1] && pos[1] <= lr[1]){
                    matte_layer = layer;
                    break;
                }
            }
        }
        if (matte_layer == null){
            myPanel.grp.groupFour.info.text = "No block at layer-selector's position";
            return;
        }
        if (selectedLayer.length == 0){
            myPanel.grp.groupFour.info.text = "Please select at least one layer you want to use as source.";
            return;
        }
        for (var i = 0; i < selectedLayer.length; i++) {
            layer = selectedLayer[i];
            layer.trackMatteLayer.enabled = true; // Set enabled if had matte
            layer.setTrackMatte(matte_layer, TrackMatteType.ALPHA)
        }
    }

    function highlightChildren(myPanel){
        var myComp = app.project.activeItem;
        var layerCollection = myComp.layers;
        var layer_selector_layer = myComp.layer("layer_selector");
        myPanel.grp.groupFour.info.text = "Place layer_selector to the block you want to highlight.";
        if (layer_selector_layer == null){
            layer_selector_layer = myComp.layers.addSolid([156/255,116/255,114/255], "layer_selector", 80, 80, 1);
            layer_selector_layer.property("rotation").setValue(45);
            layer_selector_layer.guideLayer = true;
            layer_selector_layer.moveToBeginning();
            return;
        }
        layer_selector_layer.moveToBeginning();
        pos = layer_selector_layer.property("position").value;
        for (var i = 1; i <= layerCollection.length; i++){
            layer = layerCollection[i];
            layer.selected = false;
            if (layer.nullLayer || !layer.enabled || layer.Effects.property(layer.name) == null)
                continue;
            else{
                cp = layer.Effects.property(layer.name)
                ul = cp.property(1).value;
                lr = cp.property(4).value;
                // Check if pos is in the bounding box of corner pin
                if (pos[0] >= ul[0] && pos[0] <= lr[0] && pos[1] >= ul[1] && pos[1] <= lr[1]){
                    layer.selected = true;
                    layer.solo = !layer.solo;
                }
            }
        }
    }

    function mergeChildren(){
        var myComp = app.project.activeItem;
        var layerCollection = myComp.selectedLayers;
        var layer_to_remove = [];
        var layer_to_enable = [];
        for (var i = 0; i < layerCollection.length; i++){
            layer = layerCollection[i];
            layer_to_enable.push(layer.name.substring(5, layer.name.length));
            if (!layer.nullLayer)
                continue;
            children_name_front = layer.name.substring(5, layer.name.length)
            for (var j = 1; j <= myComp.layers.length; j++){
                other_layer = myComp.layer(j);
                if (other_layer.name.substring(0, children_name_front.length) == children_name_front){
                    if (other_layer.name.length > children_name_front.length){
                        other_layer.selected = true;
                        layer_to_remove.push(other_layer.name);
                        layer_to_remove.push("Sep: " + other_layer.name)
                    }
                }
            }
            layer.selected = false;
        }
        layer.remove();
        for (var i = 0; i < layer_to_remove.length; i++){
            l = myComp.layer(layer_to_remove[i]);
            if (l != null){
                l.remove();
            }
        }
        for (var i = 0; i < layer_to_enable.length; i++){
            l = myComp.layer(layer_to_enable[i]);
            if (l != null){
                l.enabled = true;
            }
        }
    }

    function validateSelection(myPanel){
        // Validate the selected layers
        var myComp = app.project.activeItem;
        if (!myComp || !(myComp instanceof CompItem)) {
            myPanel.grp.groupFour.info.text = "Please select a comp";
			return false;
		}
        var layerCollection = myComp.selectedLayers;
		if (layerCollection.length === 0) {
            myPanel.grp.groupFour.info.text = "Please select at least one layer";
            return false;
        }
        return true;
    }

    function getRandomColor(){
        colorIdx ++;
        switch(colorIdx % 4){
            case 0: // Red
                return [245/255, 15/255, 15/255]
                break;
            case 1: // Green/Yellow
                return [252/255, 227/255, 23/255]
                break;
            case 2: // Blue/Purple
                return [12/255, 127/255, 190/255]
                break;
            case 3: // White
                return [255/255, 255/255, 255/255]
                break;
        }
    }

    function addCornerPin(layer, ul, ur, ll, lr){
        cp = layer.Effects.addProperty("Corner Pin")
        cp.name = layer.name
        cp.property(1).setValue(ul);
        cp.property(2).setValue(ur);
        cp.property(3).setValue(ll);
        cp.property(4).setValue(lr);
        return cp;
    }

    function addExpression(cpPropertyGroup, direction, child_type){
        if (direction == "v"){
            if (child_type == "R"){
                cpPropertyGroup.property(1).expression = '\
                    parent = thisComp.layer(thisLayer.name.split("->").slice(0,-1).join("->"));\
                    parentControl = thisComp.layer("Sep: " + thisLayer.name.split("->").slice(0,-1).join("->"));\
                    if (parent != null){\
                        parentCP = thisComp.layer(parent.name).effect(parent.name);\
                        parentMargin = thisComp.layer("Sep: " + parent.name).effect("Margin")("Slider");\
                        y = parentCP("Upper Left")[1];\
                        x = parentControl.transform.position[0];\
                        value = [x, y];\
                        value += [parentMargin/2, 0];\
                    }\
                    value\
                ';
                cpPropertyGroup.property(2).expression = '\
                    parent = thisComp.layer(thisLayer.name.split("->").slice(0,-1).join("->"));\
                    if (parent != null){\
                        parentCP = thisComp.layer(parent.name).effect(parent.name);\
                        parentMargin = thisComp.layer("Sep: " + parent.name).effect("Margin")("Slider");\
                        value = parentCP("Upper Right")\
                    }\
                    value\
                ';
                cpPropertyGroup.property(3).expression = '\
                    parent = thisComp.layer(thisLayer.name.split("->").slice(0,-1).join("->"));\
                    parentControl = thisComp.layer("Sep: " + thisLayer.name.split("->").slice(0,-1).join("->"));\
                    if (parent != null){\
                        parentCP = thisComp.layer(parent.name).effect(parent.name);\
                        parentMargin = thisComp.layer("Sep: " + parent.name).effect("Margin")("Slider");\
                        y = parentCP("Lower Left")[1];\
                        x = parentControl.transform.position[0];\
                        value = [x, y];\
                        value += [parentMargin/2, 0];\
                    }\
                    value\
                ';
                cpPropertyGroup.property(4).expression = '\
                    parent = thisComp.layer(thisLayer.name.split("->").slice(0,-1).join("->"));\
                    if (parent != null){\
                        parentCP = thisComp.layer(parent.name).effect(parent.name);\
                        parentMargin = thisComp.layer("Sep: " + parent.name).effect("Margin")("Slider");\
                        value = parentCP("Lower Right")\
                    }\
                    value\
                ';
            } else {
                cpPropertyGroup.property(1).expression = '\
                    parent = thisComp.layer(thisLayer.name.split("->").slice(0,-1).join("->"));\
                    if (parent != null){\
                        parentCP = thisComp.layer(parent.name).effect(parent.name);\
                        parentMargin = thisComp.layer("Sep: " + parent.name).effect("Margin")("Slider");\
                        value = parentCP("Upper Left")\
                    }\
                    value\
                ';
                cpPropertyGroup.property(2).expression = '\
                    parent = thisComp.layer(thisLayer.name.split("->").slice(0,-1).join("->"));\
                    parentControl = thisComp.layer("Sep: " + thisLayer.name.split("->").slice(0,-1).join("->"));\
                    if (parent != null){\
                        parentCP = thisComp.layer(parent.name).effect(parent.name);\
                        parentMargin = thisComp.layer("Sep: " + parent.name).effect("Margin")("Slider");\
                        y = parentCP("Upper Right")[1];\
                        x = parentControl.transform.position[0];\
                        value = [x, y];\
                        value += [-parentMargin/2, 0];\
                    }\
                    value\
                ';
                cpPropertyGroup.property(3).expression = '\
                    parent = thisComp.layer(thisLayer.name.split("->").slice(0,-1).join("->"));\
                    if (parent != null){\
                        parentCP = thisComp.layer(parent.name).effect(parent.name);\
                        parentMargin = thisComp.layer("Sep: " + parent.name).effect("Margin")("Slider");\
                        value = parentCP("Lower Left")\
                    }\
                    value\
                ';
                cpPropertyGroup.property(4).expression = '\
                    parent = thisComp.layer(thisLayer.name.split("->").slice(0,-1).join("->"));\
                    parentControl = thisComp.layer("Sep: " + thisLayer.name.split("->").slice(0,-1).join("->"));\
                    if (parent != null){\
                        parentCP = thisComp.layer(parent.name).effect(parent.name);\
                        y = parentCP("Lower Right")[1];\
                        x = parentControl.transform.position[0];\
                        parentMargin = thisComp.layer("Sep: " + parent.name).effect("Margin")("Slider");\
                        value = [x, y];\
                        value += [-parentMargin/2, 0];\
                    }\
                    value\
                ';
            }
        }
        if (direction == "h"){ // Split horizontally
            if (child_type == "U"){ // Upper child
                cpPropertyGroup.property(1).expression = '\
                    parent = thisComp.layer(thisLayer.name.split("->").slice(0,-1).join("->"));\
                    if (parent != null){\
                        parentCP = thisComp.layer(parent.name).effect(parent.name);\
                        parentMargin = thisComp.layer("Sep: " + parent.name).effect("Margin")("Slider");\
                        value = parentCP("Upper Left")\
                    }\
                    value\
                ';
                cpPropertyGroup.property(2).expression = '\
                    parent = thisComp.layer(thisLayer.name.split("->").slice(0,-1).join("->"));\
                    if (parent != null){\
                        parentCP = thisComp.layer(parent.name).effect(parent.name);\
                        parentMargin = thisComp.layer("Sep: " + parent.name).effect("Margin")("Slider");\
                        value = parentCP("Upper Right")\
                    }\
                    value\
                ';
                cpPropertyGroup.property(3).expression = '\
                    parent = thisComp.layer(thisLayer.name.split("->").slice(0,-1).join("->"));\
                    parentControl = thisComp.layer("Sep: " + thisLayer.name.split("->").slice(0,-1).join("->"));\
                    if (parent != null){\
                        parentCP = thisComp.layer(parent.name).effect(parent.name);\
                        parentMargin = thisComp.layer("Sep: " + parent.name).effect("Margin")("Slider");\
                        x = parentCP("Lower Left")[0];\
                        y = parentControl.transform.position[1];\
                        value = [x, y];\
                        value += [0, -parentMargin/2];\
                    }\
                    value\
                ';
                cpPropertyGroup.property(4).expression = '\
                    parent = thisComp.layer(thisLayer.name.split("->").slice(0,-1).join("->"));\
                    parentControl = thisComp.layer("Sep: " + thisLayer.name.split("->").slice(0,-1).join("->"));\
                    if (parent != null){\
                        parentCP = thisComp.layer(parent.name).effect(parent.name);\
                        parentMargin = thisComp.layer("Sep: " + parent.name).effect("Margin")("Slider");\
                        x = parentCP("Lower Right")[0];\
                        y = parentControl.transform.position[1];\
                        value = [x, y];\
                        value += [0, -parentMargin/2];\
                    }\
                    value\
                ';
            } else { // Bottom Child
                cpPropertyGroup.property(1).expression = '\
                    parent = thisComp.layer(thisLayer.name.split("->").slice(0,-1).join("->"));\
                    parentControl = thisComp.layer("Sep: " + thisLayer.name.split("->").slice(0,-1).join("->"));\
                    if (parent != null){\
                        parentCP = thisComp.layer(parent.name).effect(parent.name);\
                        parentMargin = thisComp.layer("Sep: " + parent.name).effect("Margin")("Slider");\
                        x = parentCP("Upper Left")[0];\
                        y = parentControl.transform.position[1];\
                        value = [x, y];\
                        value += [0, parentMargin/2];\
                    }\
                    value\
                ';
                cpPropertyGroup.property(2).expression = '\
                    parent = thisComp.layer(thisLayer.name.split("->").slice(0,-1).join("->"));\
                    parentControl = thisComp.layer("Sep: " + thisLayer.name.split("->").slice(0,-1).join("->"));\
                    if (parent != null){\
                        parentCP = thisComp.layer(parent.name).effect(parent.name);\
                        parentMargin = thisComp.layer("Sep: " + parent.name).effect("Margin")("Slider");\
                        x = parentCP("Upper Right")[0];\
                        y = parentControl.transform.position[1];\
                        value = [x, y];\
                        value += [0, parentMargin/2];\
                    }\
                    value\
                ';
                cpPropertyGroup.property(3).expression = '\
                    parent = thisComp.layer(thisLayer.name.split("->").slice(0,-1).join("->"));\
                    if (parent != null){\
                        parentCP = thisComp.layer(parent.name).effect(parent.name);\
                        parentMargin = thisComp.layer("Sep: " + parent.name).effect("Margin")("Slider");\
                        value = parentCP("Lower Left")\
                    }\
                    value\
                ';
                cpPropertyGroup.property(4).expression = '\
                    parent = thisComp.layer(thisLayer.name.split("->").slice(0,-1).join("->"));\
                    if (parent != null){\
                        parentCP = thisComp.layer(parent.name).effect(parent.name);\
                        parentMargin = thisComp.layer("Sep: " + parent.name).effect("Margin")("Slider");\
                        value = parentCP("Lower Right")\
                    }\
                    value\
                ';
            }
        }
        if (direction == null){ // Root layer
            cpPropertyGroup.property(1).expression = '\
                margin = thisLayer.effect("Margin")("Slider")\
                value += [margin, margin]\
            ';
            cpPropertyGroup.property(2).expression = '\
                margin = thisLayer.effect("Margin")("Slider")\
                value += [-margin, margin]\
            ';
            cpPropertyGroup.property(3).expression = '\
                margin = thisLayer.effect("Margin")("Slider")\
                value += [margin, -margin]\
            ';
            cpPropertyGroup.property(4).expression = '\
                margin = thisLayer.effect("Margin")("Slider")\
                value += [-margin, -margin]\
            ';
        }
    }

    function adjustMargin(sliderValue){
        // Find all Sep layers, add margin slider if not exist
        var myComp = app.project.activeItem;
        var layerCollection = myComp.layers;
        var rootName = null;
        for (var i = 1; i <= layerCollection.length; i++){
            layer = layerCollection[i]
            if (layer.name.slice(0, 5) == "Sep: "){
                if (rootName == null){
                    rootName = layer.name.slice(5, layer.name.length).split("->")[0];
                }
                // Check if has "margin" property
                margin = layer.Effects.property("Margin");
                if (margin == null){
                    margin = layer.Effects.addProperty("Slider Control");
                    margin.name = "Margin"
                }
                margin.property(1).expression = '\
                    value + ' + parseInt(sliderValue) + '\
                ';
            }
        }

        // Add margin to parent
        if (rootName != null){
            root_layer = myComp.layer(rootName)
            margin = root_layer.Effects.property("Margin");
            if (margin == null){
                margin = root_layer.Effects.addProperty("Slider Control");
                margin.name = "Margin"
            }
            margin.property(1).expression = '\
            value + ' + parseInt(sliderValue) + '\
            ';
            root_cp = root_layer.Effects.property(root_layer.name);
            addExpression(root_cp, null, null);
        }
    }

    function split_layer(myPanel, direction){
        var myComp = app.project.activeItem;
        var layerCollection = myComp.selectedLayers;
        var splitNames = []

        // Collect layer names to be splitted
        for (var i = 0; i < layerCollection.length; i++){
            layer = layerCollection[i];
            layer.enabled = false;
            splitNames.push(layer.name)
        }

        for (var i = 0; i < splitNames.length; i++){
            layer = app.project.activeItem.layer(splitNames[i]);

            // Check if child layer exists, do nothing if so
            child_name1 = layer.name + "->L";
            child_name2 = layer.name + "->R";
            child_name3 = layer.name + "->U";
            child_name4 = layer.name + "->B";
            if (myComp.layer(child_name1) != null || myComp.layer(child_name2) != null || myComp.layer(child_name3) != null || myComp.layer(child_name4) != null){
                myPanel.grp.groupFour.info.text = "Layer " + layer.name + " already splitted";
                continue;
            }
            
            // Add corner pin to current layer
            corner_pin = layer.Effects.property(layer.name);
            if (corner_pin == null){
                corner_pin = layer.Effects.addProperty("Corner Pin");
                corner_pin.name = layer.name;
            }

            // Add sep_layer
            sep_layer = myComp.layers.addNull()
            sep_layer.source.name = "Sep: " + layer.name
            sep_layer.property("Position").setValue([0, 0]);
            
            if (direction == 'v'){
                sep_layer.property("Position").expression = '\
                parent = thisComp.layer("' + layer.name + '").effect("' + layer.name + '");\
                x = value[0] + (parent("Upper Left")[0] + parent("Upper Right")[0]) / 2;\
                x = x > parent("Upper Right")[0] ? parent("Upper Right")[0] : x < parent("Upper Left")[0] ? parent("Upper Left")[0] : x;\
                y = (parent("Upper Left")[1] + parent("Lower Left")[1]) / 2;\
                [x, y]\
                ';
            } else {
                sep_layer.property("Position").expression = '\
                parent = thisComp.layer("' + layer.name + '").effect("' + layer.name + '");\
                x = (parent("Upper Left")[0] + parent("Upper Right")[0]) / 2;\
                y = value[1] + (parent("Upper Left")[1] + parent("Lower Left")[1]) / 2;\
                y = y > parent("Lower Left")[1] ? parent("Lower Left")[1] : y < parent("Upper Left")[1] ? parent("Upper Left")[1] : y;\
                [x, y]\
                ';
            }
            
            // Add child layers
            if (direction == "v"){
                left_layer = myComp.layers.addSolid(getRandomColor(), layer.name + "->L", myComp.width, myComp.height, 1)
                cp1 = addCornerPin(
                    left_layer,
                    [corner_pin.property(1).value[0], corner_pin.property(1).value[1]],
                    [(corner_pin.property(2).value[0] + corner_pin.property(1).value[0]) / 2, corner_pin.property(1).value[1]],
                    [corner_pin.property(3).value[0], corner_pin.property(3).value[1]],
                    [(corner_pin.property(4).value[0] + corner_pin.property(3).value[0]) / 2, corner_pin.property(4).value[1]]
                )
                addExpression(cp1, direction, "L");
                right_layer = myComp.layers.addSolid(getRandomColor(), layer.name + "->R", myComp.width, myComp.height, 1)
                cp2 =addCornerPin(
                    right_layer,
                    [(corner_pin.property(2).value[0] + corner_pin.property(1).value[0]) / 2, corner_pin.property(1).value[1]],
                    [corner_pin.property(2).value[0], corner_pin.property(2).value[1]],
                    [(corner_pin.property(4).value[0] + corner_pin.property(3).value[0]) / 2, corner_pin.property(3).value[1]],
                    [corner_pin.property(4).value[0], corner_pin.property(4).value[1]],
                )
                addExpression(cp2, direction, "R");
            } else {
                up_layer = myComp.layers.addSolid(getRandomColor(), layer.name + "->U", myComp.width, myComp.height, 1)
                cp1 = addCornerPin(
                    up_layer,
                    [corner_pin.property(1).value[0], corner_pin.property(1).value[1]],
                    [corner_pin.property(2).value[0], corner_pin.property(2).value[1]],
                    [corner_pin.property(3).value[0], (corner_pin.property(1).value[1] + corner_pin.property(3).value[1]) / 2],
                    [corner_pin.property(4).value[0], (corner_pin.property(2).value[1] + corner_pin.property(4).value[1]) / 2],
                )
                addExpression(cp1, direction, "U");
                bottom_layer = myComp.layers.addSolid(getRandomColor(), layer.name + "->B", myComp.width, myComp.height, 1)
                cp2 = addCornerPin(
                    bottom_layer,
                    [corner_pin.property(1).value[0], (corner_pin.property(2).value[1] + corner_pin.property(4).value[1]) / 2],
                    [corner_pin.property(2).value[0], (corner_pin.property(2).value[1] + corner_pin.property(4).value[1]) / 2],
                    [corner_pin.property(3).value[0], corner_pin.property(3).value[1]],
                    [corner_pin.property(4).value[0], corner_pin.property(4).value[1]],
                )
                addExpression(cp2, direction, "B");
            }            
        }
        adjustMargin(parseInt(myPanel.grp.groupTwo.marginSlider.value));
        // Move sep layers to top
        for (var i = 1; i <= myComp.layers.length; i++){
            curlayer = myComp.layer(i);
            if (curlayer.name.slice(0, 5) == "Sep: "){
                curlayer.moveToBeginning();
            }
        }
        // Move parent layers to bottom
        for (var i = myComp.layers.length; i >= 1; i--){
            curlayer = myComp.layer(i);
            if (curlayer.enabled == false){
                curlayer.moveToEnd();
            }
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
