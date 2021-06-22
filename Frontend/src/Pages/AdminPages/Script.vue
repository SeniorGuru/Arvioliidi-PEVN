<template>
    <div>
        <h1 ref="text">
            &lt;script src="https://arvioliidi.com/api/calculator-script"
            key='VEC-{{ $store.state.user.identify }}'&gt;&lt;/script&gt;
        </h1>
        <!-- <b-btn @click="copyScript">Copay</b-btn> -->
    </div>
</template>

<script>
export default {
    data: () => ({
        identify: ""
    }),
    methods: {
        // copyScript(){
        //  this.selectText(this.$refs.text)
        //  document.execCommand("copy");
        // }
    },
    mounted() {
        this.identify = this.$store.state.user.identify;
    }
};
</script>
